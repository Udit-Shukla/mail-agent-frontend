import { io, Socket } from 'socket.io-client';

interface MailFolder {
  id: string;
  displayName: string;
  totalItemCount: number;
  unreadItemCount: number;
}

interface MailMessage {
  id: string;
  subject: string;
  from: string;
  preview: string;
  timestamp: string;
  read: boolean;
  important: boolean;
  folder: string;
}

interface EmailDetails {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  content: string;
  timestamp: string;
  read: boolean;
  folder: string | null;
  important: boolean;
  flagged: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    contentId?: string;
    contentType: string;
    size: number;
    isInline: boolean;
    contentBytes: string;
  }>;
}

type SocketEventHandlers = {
  'mail:folders': (folders: MailFolder[]) => void;
  'mail:folderMessages': (data: { folderId: string; messages: MailMessage[]; nextLink: string | null; page: number }) => void;
  'mail:message': (message: EmailDetails) => void;
  'mail:sent': (result: { success: boolean; error?: string }) => void;
  'mail:markedRead': (messageId: string) => void;
  'mail:importantMarked': (data: { messageId: string; flag: boolean }) => void;
  'mail:error': (error: string) => void;
  'mail:promptDateRange': () => void;
  'mail:new': (message: MailMessage) => void;
  'mail:syncComplete': () => void;
  'mail:deleted': (data: { messageId: string }) => void;
  'mail:categoryUpdated': (data: { 
    messageId: string; 
    category: string; 
    aiMeta: {
      summary: string;
      category: string;
      priority: 'urgent' | 'high' | 'medium' | 'low';
      sentiment: 'positive' | 'negative' | 'neutral';
      actionItems: string[];
      enrichedAt: string;
      version: string;
      error?: string;
    };
  }) => void;
  'mail:enrichmentStatus': (data: { 
    messageId: string; 
    status: 'queued' | 'analyzing' | 'completed' | 'error';
    message: string;
    aiMeta?: {
      summary: string;
      category: string;
      priority: 'urgent' | 'high' | 'medium' | 'low';
      sentiment: 'positive' | 'negative' | 'neutral';
      actionItems: string[];
      enrichedAt: string;
      version: string;
      error?: string;
    };
  }) => void;
};

let socket: (Socket & { connectedEmail?: string | null }) | null = null;
let isInitializing = false;
let connectedEmail: string | null = null;
let eventHandlers: Partial<SocketEventHandlers> = {};
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const initializeSocket = (appUserId: string, email?: string): Socket => {
  // If socket exists and is connected with the same email, reuse it
  if (socket?.connected && email === connectedEmail) {
    return socket;
  }

  // If already initializing, wait
  if (isInitializing) {
    return socket!;
  }

  const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  isInitializing = true;

  // If there's an existing socket but with different email, clean it up
  if (socket && connectedEmail !== email) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    eventHandlers = {};
    reconnectAttempts = 0;
  }

  // Only create a new socket if we don't have one
  if (!socket) {
    socket = io(serverUrl, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      query: { appUserId },
      withCredentials: true,
      forceNew: true,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: true,
      secure: true,
      rejectUnauthorized: false
    });

    socket.on('connect', () => {
      isInitializing = false;
      connectedEmail = email || null;
      reconnectAttempts = 0;

      if (email) {
        socket!.emit('mail:init', { appUserId, email });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      isInitializing = false;
      
      // Only attempt reconnect if we haven't exceeded max attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => {
          if (socket && !socket.connected) {
              console.log(`🔄 Attempting to reconnect (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            socket.connect();
          }
        }, 1000);
        }
      } else {
        console.log('❌ Max reconnection attempts reached');
      }
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      isInitializing = false;
      
      if (err.message.includes('unauthorized')) {
        console.log('🔒 Authentication required');
        eventHandlers['mail:error']?.('Authentication required');
        return;
      }

      // Only attempt reconnect if we haven't exceeded max attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
      setTimeout(() => {
        if (socket && !socket.connected) {
            console.log(`🔄 Attempting to reconnect after error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          socket.connect();
        }
      }, 1000);
      } else {
        console.log('❌ Max reconnection attempts reached');
      }
    });

    // Set up mail event handlers
    socket.on('mail:folders', (folders: MailFolder[]) => {
      eventHandlers['mail:folders']?.(folders);
    });

    socket.on('mail:folderMessages', (data: { folderId: string; messages: MailMessage[]; nextLink: string | null; page: number }) => {
      eventHandlers['mail:folderMessages']?.(data);
    });

    socket.on('mail:message', (message: EmailDetails) => {
      eventHandlers['mail:message']?.(message);
    });

    socket.on('mail:sent', (result: { success: boolean; error?: string }) => {
      console.log('📤 Email sent result:', result);
      eventHandlers['mail:sent']?.(result);
    });

    socket.on('mail:markedRead', (messageId: string) => {
      console.log('✓ Marked as read:', messageId);
      eventHandlers['mail:markedRead']?.(messageId);
    });

    socket.on('mail:importantMarked', (data: { messageId: string; flag: boolean }) => {
      console.log('⭐ Importance updated:', data);
      eventHandlers['mail:importantMarked']?.(data);
    });

    socket.on('mail:error', (error: string) => {
      console.error('📭 Mail error:', error);
      if (error.includes('Token not found')) {
        console.log('🔑 Token not found, waiting for authentication...');
        eventHandlers['mail:error']?.(error);
        return;
      }
      if (error.includes('Token expired')) {
        console.log('⏰ Token expired, waiting for refresh...');
        eventHandlers['mail:error']?.(error);
        return;
      }
      eventHandlers['mail:error']?.(error);
    });

    socket.on('mail:new', (message: MailMessage) => {
      console.log('📧 New message:', message.id);
      eventHandlers['mail:new']?.(message);
    });

    socket.on('mail:syncComplete', () => {
      console.log('📅 Sync complete');
      eventHandlers['mail:syncComplete']?.();
    });

    socket.on('mail:deleted', (data: { messageId: string }) => {
      console.log('📄 Message deleted:', data.messageId);
      eventHandlers['mail:deleted']?.(data);
    });

    socket.on('mail:enrichmentStatus', (data: { 
      messageId: string; 
      status: 'queued' | 'analyzing' | 'completed' | 'error';
      message: string;
      aiMeta?: {
        summary: string;
        category: string;
        priority: 'urgent' | 'high' | 'medium' | 'low';
        sentiment: 'positive' | 'negative' | 'neutral';
        actionItems: string[];
        enrichedAt: string;
        version: string;
        error?: string;
      };
    }) => {
      eventHandlers['mail:enrichmentStatus']?.(data);
    });

    socket.on('mail:categoryUpdated', (data: { 
      messageId: string; 
      category: string; 
      aiMeta: {
        summary: string;
        category: string;
        priority: 'urgent' | 'high' | 'medium' | 'low';
        sentiment: 'positive' | 'negative' | 'neutral';
        actionItems: string[];
        enrichedAt: string;
        version: string;
        error?: string;
      };
    }) => {
      eventHandlers['mail:categoryUpdated']?.(data);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    console.log('🔌 Disconnecting socket...');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    eventHandlers = {};
    connectedEmail = null;
    isInitializing = false;
    reconnectAttempts = 0;
  }
};

export const setSocketEventHandler = <K extends keyof SocketEventHandlers>(
  event: K,
  handler: SocketEventHandlers[K] | (() => void)
) => {
  if (typeof handler === 'function') {
    eventHandlers[event] = handler as SocketEventHandlers[K];
  }
};

export const emitMailEvent = {
  getFolder: (data: { appUserId: string; email: string; folderId: string; page: number }) => {
    socket?.emit('mail:getFolder', data);
  },
  getMessage: (data: { appUserId: string; email: string; messageId: string }) => {
    socket?.emit('mail:getMessage', data);
  },
  sendEmail: (data: { appUserId: string; email: string; to: string; subject: string; body: string; cc?: string; bcc?: string }) => {
    socket?.emit('mail:send', data);
  },
  markRead: (data: { appUserId: string; email: string; messageId: string }) => {
    socket?.emit('mail:markRead', data);
  },
  markImportant: (data: { appUserId: string; email: string; messageId: string; flag: boolean }) => {
    socket?.emit('mail:markImportant', data);
  },
  retryEnrichment: (data: { appUserId: string; email: string; messageId: string }) => {
    socket?.emit('mail:retryEnrichment', data);
  },
  enrichEmails: (data: { appUserId: string; email: string; messageIds: string[] }) => {
    socket?.emit('mail:enrichEmails', data);
  },
  deleteMessage: (data: { appUserId: string; email: string; messageId: string }) => {
    socket?.emit('mail:delete', data);
  },
  updateEmailCategory: (data: { appUserId: string; email: string; messageId: string; category: string }) => {
    socket?.emit('mail:updateCategory', data);
  }
};

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
};

let socket: Socket | null = null;
let isInitializing = false;
let connectedEmail: string | null = null;
let eventHandlers: Partial<SocketEventHandlers> = {};

export const initializeSocket = (appUserId: string, email?: string): Socket => {
  // If socket exists and is connected with the same email, reuse it
  if (socket?.connected && email === connectedEmail) {
    console.log('🔄 Reusing existing socket connection for:', email);
    return socket;
  }

  // If already initializing, wait
  if (isInitializing) {
    console.log('⏳ Socket initialization in progress...');
    return socket!;
  }

  const serverUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  console.log('🔌 Initializing socket with:', { serverUrl, appUserId, email });

  isInitializing = true;

  // If there's an existing socket but with different email, clean it up
  if (socket && connectedEmail !== email) {
    console.log('🔌 Cleaning up existing socket connection...');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    eventHandlers = {};
  }

  // Only create a new socket if we don't have one
  if (!socket) {
    socket = io(serverUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      query: { appUserId },
      withCredentials: true,
      forceNew: true,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id);
      isInitializing = false;
      connectedEmail = email || null;

      if (email) {
        console.log('📧 Emitting mail:init for:', email);
        socket!.emit('mail:init', { appUserId, email });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      isInitializing = false;
      
      // Try to reconnect on any disconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => {
          if (socket && !socket.connected) {
            console.log('🔄 Attempting to reconnect...');
            socket.connect();
          }
        }, 1000);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      isInitializing = false;
      
      // Handle specific error cases
      if (err.message.includes('unauthorized')) {
        disconnectSocket();
        return;
      }

      // For other errors, try to reconnect
      setTimeout(() => {
        if (socket && !socket.connected) {
          console.log('🔄 Attempting to reconnect after error...');
          socket.connect();
        }
      }, 1000);
    });

    // Set up mail event handlers
    socket.on('mail:folders', (folders: MailFolder[]) => {
      console.log('📁 Received folders:', folders);
      eventHandlers['mail:folders']?.(folders);
    });

    socket.on('mail:folderMessages', (data: { folderId: string; messages: MailMessage[]; nextLink: string | null; page: number }) => {
      console.log('📨 Folder:', data.folderId, '| Messages:', data.messages?.length);
      eventHandlers['mail:folderMessages']?.(data);
    });

    socket.on('mail:message', (message: EmailDetails) => {
      console.log('📧 Received message details:', message.id);
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
      if (error.includes('Token not found') || error.includes('Token expired')) {
        disconnectSocket();
      }
      eventHandlers['mail:error']?.(error);
    });

    socket.on('mail:promptDateRange', () => {
      console.log('📅 Prompting date range');
      eventHandlers['mail:promptDateRange']?.();
    });

    socket.on('mail:new', (message: MailMessage) => {
      console.log('📧 New message:', message.id);
      eventHandlers['mail:new']?.(message);
    });

    socket.on('mail:syncComplete', () => {
      console.log('📅 Sync complete');
      eventHandlers['mail:syncComplete']?.();
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
  syncInRange: (data: { appUserId: string; email: string; startDate: string; endDate: string }) => {
    socket?.emit('mail:syncInRange', data);
  },
  retryEnrichment: (data: { appUserId: string; email: string; messageId: string }) => {
    socket?.emit('mail:retryEnrichment', data);
  }
};

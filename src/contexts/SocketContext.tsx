'use client'

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { initializeSocket, disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';
import { Socket } from 'socket.io-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketEventHandler = (...args: any[]) => void;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  addEventHandler: (event: string, handler: SocketEventHandler) => void;
  removeEventHandler: (event: string, handler: SocketEventHandler) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  addEventHandler: () => {},
  removeEventHandler: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const eventHandlersRef = useRef<Map<string, Set<SocketEventHandler>>>(new Map());

  // Function to add event handlers
  const addEventHandler = useCallback((event: string, handler: SocketEventHandler) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)?.add(handler);
  }, []);

  // Function to remove event handlers
  const removeEventHandler = useCallback((event: string, handler: SocketEventHandler) => {
    eventHandlersRef.current.get(event)?.delete(handler);
  }, []);

  useEffect(() => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');

    console.log('[Debug] SocketContext: Checking initialization conditions:', {
      hasAppUserId: !!appUserId,
      hasActiveEmail: !!activeEmail
    });

    if (!appUserId || !activeEmail) {
      console.log('[Debug] SocketContext: Missing required data, redirecting to home');
      router.push('/');
      return;
    }

    const initSocket = () => {
      console.log('[Debug] SocketContext: Initializing socket connection...');
      
      // Clean up existing socket if it exists
      if (socketRef.current) {
        console.log('[Debug] SocketContext: Cleaning up existing socket...');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      socketRef.current = initializeSocket(appUserId, activeEmail);

      // Set up core socket event handlers
      socketRef.current.on('connect', () => {
        console.log('[Debug] SocketContext: Socket connected successfully');
        setIsConnected(true);
        retryCountRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('[Debug] SocketContext: Socket disconnected:', reason);
        setIsConnected(false);

        if (reason !== 'io client disconnect') {
          console.log('[Debug] SocketContext: Attempting to reconnect...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              console.log('[Debug] SocketContext: Reconnecting...');
              socketRef.current.connect();
            }
          }, 1000);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('[Debug] SocketContext: Connection error:', error.message);
        setIsConnected(false);
        
        if (error.message.includes('unauthorized')) {
          console.log('[Debug] SocketContext: Unauthorized error, redirecting to login');
          toast.error('Session expired. Please log in again.');
          disconnectSocket();
          router.push('/');
          return;
        }

        retryCountRef.current++;
        console.log('[Debug] SocketContext: Retry attempt:', retryCountRef.current);
        
        if (retryCountRef.current >= maxRetries) {
          console.log('[Debug] SocketContext: Max retries reached');
          toast.error('Unable to connect to mail server. Please refresh the page.');
          return;
        }

        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        console.log('[Debug] SocketContext: Scheduling retry in', retryDelay, 'ms');
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            console.log('[Debug] SocketContext: Executing retry...');
            socketRef.current.connect();
          }
        }, retryDelay);
      });

      // Set up event forwarding
      const events = [
        'mail:folders', 'mail:folderMessages', 'mail:message', 'mail:sent',
        'mail:markedRead', 'mail:importantMarked', 'mail:error', 'mail:promptDateRange',
        'mail:new', 'mail:syncComplete', 'mail:enrichmentStatus'
      ];

      events.forEach(event => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socketRef.current?.on(event, (...args: any[]) => {
          const handlers = eventHandlersRef.current.get(event);
          if (handlers) {
            handlers.forEach(handler => handler(...args));
          }
        });
      });
    };

    initSocket();

    // Cleanup function
    return () => {
      console.log('[Debug] SocketContext: Cleaning up...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      eventHandlersRef.current.clear();
    };
  }, []);

  // Handle email changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeEmail' && e.newValue) {
        const appUserId = localStorage.getItem('appUserId');
        if (appUserId && socketRef.current) {
          console.log('[Debug] SocketContext: Email changed, reinitializing socket...');
          disconnectSocket();
          socketRef.current = initializeSocket(appUserId, e.newValue);
          setIsConnected(true);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    addEventHandler,
    removeEventHandler
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
} 
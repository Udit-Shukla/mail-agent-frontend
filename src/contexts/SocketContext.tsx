'use client'

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { initializeSocket, disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';

interface SocketContextType {
  socket: ReturnType<typeof initializeSocket> | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const socketRef = useRef<ReturnType<typeof initializeSocket> | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');

    if (!appUserId || !activeEmail) {
      router.push('/');
      return;
    }

    const initSocket = () => {
      console.log('🔌 Initializing socket connection...');
      socketRef.current = initializeSocket(appUserId, activeEmail);

      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected');
        setIsConnected(true);
        retryCountRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);

        // Only attempt to reconnect if it wasn't a client-side disconnect
        if (reason !== 'io client disconnect') {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              console.log('🔄 Attempting to reconnect...');
              socketRef.current.connect();
            }
          }, 1000);
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        setIsConnected(false);
        
        if (error.message.includes('unauthorized')) {
          toast.error('Session expired. Please log in again.');
          disconnectSocket();
          router.push('/');
          return;
        }

        retryCountRef.current++;
        if (retryCountRef.current >= maxRetries) {
          toast.error('Unable to connect to mail server. Please refresh the page.');
          return;
        }

        const retryDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            console.log('🔄 Attempting to reconnect after error...');
            socketRef.current.connect();
          }
        }, retryDelay);
      });
    };

    initSocket();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [router]);

  // Handle email changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeEmail' && e.newValue) {
        const appUserId = localStorage.getItem('appUserId');
        if (appUserId && socketRef.current) {
          console.log('🔄 Email changed, reinitializing socket...');
          disconnectSocket();
          socketRef.current = initializeSocket(appUserId, e.newValue);
          setIsConnected(true);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
} 
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
  // const pathname = usePathname();
  const socketRef = useRef<ReturnType<typeof initializeSocket> | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const appUserId = localStorage.getItem('appUserId');
    const activeEmail = localStorage.getItem('activeEmail');

    if (!appUserId || !activeEmail) {
      router.push('/');
      return;
    }

    // Only initialize if not already initialized
    if (!isInitializedRef.current) {
      console.log('🔌 Initializing socket connection...');
      socketRef.current = initializeSocket(appUserId, activeEmail);
      isInitializedRef.current = true;

      // Handle connection events
      socketRef.current.on('connect', () => {
        console.log('✅ Socket connected');
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);

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

        toast.error('Connection error. Attempting to reconnect...');
      });
    }

    // Cleanup on unmount
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
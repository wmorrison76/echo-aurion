/**
 * useSocket Hook
 * Provides access to Socket.io connection for real-time messaging
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;
let connectionPromise: Promise<Socket> | null = null;

/**
 * Initialize global Socket.io connection
 */
function initializeSocket(): Promise<Socket> {
  if (globalSocket) {
    return Promise.resolve(globalSocket);
  }
  
  if (connectionPromise) {
    return connectionPromise;
  }
  
  connectionPromise = new Promise((resolve) => {
    const socket = io(window.location.origin, {
      auth: {
        userId: localStorage.getItem('userId'),
        orgId: localStorage.getItem('orgId'),
        userName: localStorage.getItem('userName'),
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    
    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      globalSocket = socket;
      resolve(socket);
    });
    
    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected');
      globalSocket = null;
      connectionPromise = null;
    });
    
    socket.on('error', (error) => {
      console.error('[SOCKET] Error:', error);
    });
  });
  
  return connectionPromise;
}

/**
 * useSocket Hook
 * Returns Socket.io instance for real-time communication
 */
export const useSocket = (): Socket | null => {
  const [socket, setSocket] = useState<Socket | null>(globalSocket);
  
  useEffect(() => {
    // Initialize socket connection
    initializeSocket().then(setSocket);
    
    return () => {
      // Don't disconnect on unmount - keep connection alive
      // Only disconnect when app closes
    };
  }, []);
  
  return socket;
};

/**
 * useSocketEvent Hook
 * Subscribe to specific socket events
 */
export const useSocketEvent = (event: string, callback: (data: any) => void) => {
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    socket.on(event, callback);
    
    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);
};

/**
 * useSocketEmit Hook
 * Emit socket events
 */
export const useSocketEmit = () => {
  const socket = useSocket();
  
  return (event: string, data?: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  };
};

export default useSocket;

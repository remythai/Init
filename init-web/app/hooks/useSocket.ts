'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '../services/socket.service';
import { authService } from '../services/auth.service';

/**
 * Base hook for Socket.io connection
 * Handles connection, disconnection, and reconnection
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionAttempted = useRef(false);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    const token = authService.getToken();

    if (!token) {
      console.log('Socket: No authentication token available');
      setConnectionError('No authentication token');
      return;
    }

    try {
      const socket = socketService.connect(token);

      const handleConnect = () => {
        if (mountedRef.current) {
          console.log('Socket: Connected successfully');
          setIsConnected(true);
          setConnectionError(null);
        }
      };

      const handleDisconnect = (reason: string) => {
        if (mountedRef.current) {
          console.log('Socket: Disconnected -', reason);
          setIsConnected(false);
        }
      };

      const handleConnectError = (error: Error) => {
        if (mountedRef.current) {
          console.error('Socket: Connection error -', error.message);
          setConnectionError(error.message);
          setIsConnected(false);
        }
      };

      // Remove existing listeners before adding new ones
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      // Check if already connected
      if (socket.connected) {
        handleConnect();
      }
    } catch (error) {
      console.error('Socket: Failed to connect -', error);
      setConnectionError('Failed to connect to socket');
    }
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Only attempt connection once per mount
    if (!connectionAttempted.current) {
      connectionAttempted.current = true;
      // Delay connection slightly to ensure auth is ready
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        mountedRef.current = false;
      };
    }

    return () => {
      mountedRef.current = false;
    };
  }, [connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    socket: socketService.getSocket()
  };
}

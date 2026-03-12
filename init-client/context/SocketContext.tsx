// context/SocketContext.tsx
import { socketService } from '@/services/socket.service';
import { authService } from '@/services/auth.service';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

interface SocketContextType {
  isConnected: boolean;
  currentUserId: number | null;
}

const SocketContext = createContext<SocketContextType>({ isConnected: false, currentUserId: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      let token = await authService.getToken();
      const userType = await authService.getUserType();
      if (!token || userType !== 'user') return; // Only users use sockets (not orga)

      // Ensure token is fresh before connecting socket
      const freshToken = await authService.refreshAccessToken();
      if (freshToken) token = freshToken;

      // Get current user ID
      try {
        const profile = await authService.getCurrentUser();
        if (profile && mountedRef.current) {
          setCurrentUserId(profile.id);
        }
      } catch {}

      const socket = socketService.connect(token);

      const onConnect = () => {
        if (mountedRef.current) setIsConnected(true);
      };
      const onDisconnect = () => {
        if (mountedRef.current) setIsConnected(false);
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      if (socket.connected && mountedRef.current) {
        setIsConnected(true);
      }
    };

    init();

    // Reconnect when app comes to foreground (refresh token if expired)
    const handleAppState = async (state: AppStateStatus) => {
      if (state === 'active') {
        let token = await authService.getToken();
        if (!token) return;
        if (!socketService.isConnected()) {
          // Try to refresh the token in case it expired while in background
          const freshToken = await authService.refreshAccessToken();
          if (freshToken) token = freshToken;
          socketService.connect(token);
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      mountedRef.current = false;
      sub.remove();
      socketService.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ isConnected, currentUserId }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { socketService, SocketMessage, SocketTyping, SocketConversationUpdate } from '../services/socket.service';
import { authService } from '../services/auth.service';
import { Message } from '../services/match.service';

interface UseRealTimeMessagesOptions {
  matchId?: number | null;
  onNewMessage?: (message: Message) => void;
  onTyping?: (data: SocketTyping) => void;
  onConversationUpdate?: (data: SocketConversationUpdate) => void;
}

/**
 * Hook for real-time messaging
 * Handles joining/leaving chat rooms and receiving new messages
 */
export function useRealTimeMessages(options: UseRealTimeMessagesOptions = {}) {
  const { matchId, onNewMessage, onTyping, onConversationUpdate } = options;
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [isReady, setIsReady] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = useRef<number | null>(null);
  const joinedRooms = useRef<Set<number>>(new Set());
  const mountedRef = useRef(true);

  // Initialize connection and get current user
  useEffect(() => {
    mountedRef.current = true;
    let cleanupFn: (() => void) | undefined;

    const init = async () => {
      const token = authService.getToken();
      if (!token) {
        console.log('useRealTimeMessages: No token available');
        return;
      }

      // Get current user ID first
      try {
        const profile = await authService.getCurrentProfile();
        if (profile && 'id' in profile && mountedRef.current) {
          currentUserId.current = profile.id as number;
        }
      } catch (error) {
        console.error('useRealTimeMessages: Error getting profile:', error);
      }

      // Connect socket if not connected
      let socket = socketService.getSocket();
      if (!socketService.isConnected()) {
        console.log('useRealTimeMessages: Connecting socket...');
        socket = socketService.connect(token);
      }

      // If already connected, set ready immediately
      if (socketService.isConnected()) {
        console.log('useRealTimeMessages: Already connected');
        if (mountedRef.current) setIsReady(true);
        return;
      }

      // Wait for connection event
      const handleConnect = () => {
        if (mountedRef.current) {
          console.log('useRealTimeMessages: Socket connected via event');
          setIsReady(true);
        }
      };

      socket?.on('connect', handleConnect);

      // Also check after a delay as fallback
      const timeout = setTimeout(() => {
        if (mountedRef.current && socketService.isConnected()) {
          console.log('useRealTimeMessages: Socket ready (fallback check)');
          setIsReady(true);
        }
      }, 1000);

      cleanupFn = () => {
        socket?.off('connect', handleConnect);
        clearTimeout(timeout);
      };
    };

    init();

    return () => {
      mountedRef.current = false;
      cleanupFn?.();
    };
  }, []);

  // Join/leave chat room when matchId changes
  useEffect(() => {
    if (!matchId || !isReady) return;

    // Leave previous rooms
    joinedRooms.current.forEach((roomId) => {
      if (roomId !== matchId) {
        socketService.leaveChat(roomId);
        joinedRooms.current.delete(roomId);
      }
    });

    // Join new room
    if (!joinedRooms.current.has(matchId)) {
      socketService.joinChat(matchId);
      joinedRooms.current.add(matchId);
    }

    return () => {
      if (matchId) {
        socketService.leaveChat(matchId);
        joinedRooms.current.delete(matchId);
      }
    };
  }, [matchId, isReady]);

  // Listen for new messages
  useEffect(() => {
    if (!isReady) return;

    const unsubscribe = socketService.onNewMessage((data: SocketMessage) => {
      // Don't process messages sent by current user (already added locally)
      if (data.senderId === currentUserId.current) return;

      // Only process if for the current conversation
      if (matchId && data.matchId === matchId && onNewMessage) {
        // Add match_id to the message to satisfy the Message interface
        const messageWithMatchId: Message = {
          ...data.message,
          match_id: data.matchId
        };
        onNewMessage(messageWithMatchId);
      }
    });

    return unsubscribe;
  }, [matchId, onNewMessage, isReady]);

  // Listen for typing indicators
  useEffect(() => {
    if (!isReady) return;

    const unsubscribe = socketService.onTyping((data: SocketTyping) => {
      if (data.matchId !== matchId) return;
      if (data.userId === currentUserId.current) return;

      if (data.isTyping) {
        setTypingUsers((prev) =>
          prev.includes(data.userId) ? prev : [...prev, data.userId]
        );
      } else {
        setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
      }

      if (onTyping) {
        onTyping(data);
      }
    });

    return unsubscribe;
  }, [matchId, onTyping, isReady]);

  // Listen for conversation updates (for conversation list)
  useEffect(() => {
    if (!isReady) return;

    console.log('useRealTimeMessages: Setting up conversationUpdate listener');
    const unsubscribe = socketService.onConversationUpdate((data: SocketConversationUpdate) => {
      console.log('useRealTimeMessages: Received conversationUpdate', data);
      if (onConversationUpdate) {
        onConversationUpdate(data);
      }
    });

    return unsubscribe;
  }, [onConversationUpdate, isReady]);

  // Send typing indicator with debounce
  const sendTyping = useCallback((typing: boolean) => {
    if (!matchId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (typing) {
      if (!isTyping) {
        setIsTyping(true);
        socketService.sendTyping(matchId, true);
      }

      // Auto-stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.sendTyping(matchId, false);
      }, 3000);
    } else {
      setIsTyping(false);
      socketService.sendTyping(matchId, false);
    }
  }, [matchId, isTyping]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    isTyping,
    sendTyping
  };
}

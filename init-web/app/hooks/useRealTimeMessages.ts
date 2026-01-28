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
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = useRef<number | null>(null);
  const isConnected = useRef(false);
  const joinedRooms = useRef<Set<number>>(new Set());
  const mountedRef = useRef(true);

  // Initialize connection and get current user
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      const token = authService.getToken();
      if (!token) {
        console.log('useRealTimeMessages: No token available');
        return;
      }

      // Connect socket if not connected
      if (!socketService.isConnected()) {
        console.log('useRealTimeMessages: Connecting socket...');
        socketService.connect(token);
      }

      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (!mountedRef.current) return;

      isConnected.current = socketService.isConnected();
      console.log('useRealTimeMessages: Socket connected:', isConnected.current);

      // Get current user ID
      try {
        const profile = await authService.getCurrentProfile();
        if (profile && 'id' in profile && mountedRef.current) {
          currentUserId.current = profile.id as number;
        }
      } catch (error) {
        console.error('useRealTimeMessages: Error getting profile:', error);
      }
    };

    init();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Join/leave chat room when matchId changes
  useEffect(() => {
    if (!matchId || !isConnected.current) return;

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
  }, [matchId]);

  // Listen for new messages
  useEffect(() => {
    if (!isConnected.current) return;

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
  }, [matchId, onNewMessage]);

  // Listen for typing indicators
  useEffect(() => {
    if (!isConnected.current) return;

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
  }, [matchId, onTyping]);

  // Listen for conversation updates (for conversation list)
  useEffect(() => {
    if (!isConnected.current) return;

    const unsubscribe = socketService.onConversationUpdate((data: SocketConversationUpdate) => {
      if (onConversationUpdate) {
        onConversationUpdate(data);
      }
    });

    return unsubscribe;
  }, [onConversationUpdate]);

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

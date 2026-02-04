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

  // Use refs for callbacks to avoid re-subscribing listeners when callbacks change
  const onNewMessageRef = useRef(onNewMessage);
  const onTypingRef = useRef(onTyping);
  const onConversationUpdateRef = useRef(onConversationUpdate);
  const matchIdRef = useRef(matchId);

  // Keep refs in sync with props
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    onTypingRef.current = onTyping;
  }, [onTyping]);

  useEffect(() => {
    onConversationUpdateRef.current = onConversationUpdate;
  }, [onConversationUpdate]);

  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  // Initialize connection, get current user, and set up persistent listeners
  useEffect(() => {
    mountedRef.current = true;
    let cleanupFns: (() => void)[] = [];

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
      }

      // Wait for connection event (handles both initial connect and reconnect)
      const handleConnect = () => {
        if (mountedRef.current) {
          console.log('useRealTimeMessages: Socket connected via event');
          setIsReady(true);

          // Re-join the current chat room on reconnect
          const currentMatchId = matchIdRef.current;
          if (currentMatchId && !joinedRooms.current.has(currentMatchId)) {
            console.log('useRealTimeMessages: Re-joining room after reconnect', currentMatchId);
            socketService.joinChat(currentMatchId);
            joinedRooms.current.add(currentMatchId);
          }
        }
      };

      const handleDisconnect = () => {
        if (mountedRef.current) {
          console.log('useRealTimeMessages: Socket disconnected');
          setIsReady(false);
          // Clear joined rooms on disconnect - they'll be re-joined on reconnect
          joinedRooms.current.clear();
        }
      };

      socket?.on('connect', handleConnect);
      socket?.on('disconnect', handleDisconnect);
      cleanupFns.push(() => {
        socket?.off('connect', handleConnect);
        socket?.off('disconnect', handleDisconnect);
      });

      // Set up message listeners immediately (they persist across reconnects)
      // New messages listener
      const unsubNewMessage = socketService.onNewMessage((data: SocketMessage) => {
        if (!mountedRef.current) return;
        // Don't process messages sent by current user (already added locally)
        if (data.senderId === currentUserId.current) return;

        // Only process if for the current conversation (use ref for current matchId)
        const currentMatchId = matchIdRef.current;
        if (currentMatchId && data.matchId === currentMatchId && onNewMessageRef.current) {
          // Add match_id to the message to satisfy the Message interface
          const messageWithMatchId: Message = {
            ...data.message,
            match_id: data.matchId
          };
          onNewMessageRef.current(messageWithMatchId);
        }
      });
      cleanupFns.push(unsubNewMessage);

      // Typing listener
      const unsubTyping = socketService.onTyping((data: SocketTyping) => {
        if (!mountedRef.current) return;
        const currentMatchId = matchIdRef.current;
        if (data.matchId !== currentMatchId) return;
        if (data.userId === currentUserId.current) return;

        if (data.isTyping) {
          setTypingUsers((prev) =>
            prev.includes(data.userId) ? prev : [...prev, data.userId]
          );
        } else {
          setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
        }

        if (onTypingRef.current) {
          onTypingRef.current(data);
        }
      });
      cleanupFns.push(unsubTyping);

      // Conversation update listener
      console.log('useRealTimeMessages: Setting up conversationUpdate listener');
      const unsubConvUpdate = socketService.onConversationUpdate((data: SocketConversationUpdate) => {
        if (!mountedRef.current) return;
        console.log('useRealTimeMessages: Received conversationUpdate', data);
        if (onConversationUpdateRef.current) {
          onConversationUpdateRef.current(data);
        }
      });
      cleanupFns.push(unsubConvUpdate);

      // Also check after a delay as fallback
      const timeout = setTimeout(() => {
        if (mountedRef.current && socketService.isConnected()) {
          console.log('useRealTimeMessages: Socket ready (fallback check)');
          setIsReady(true);
        }
      }, 1000);
      cleanupFns.push(() => clearTimeout(timeout));
    };

    init();

    return () => {
      mountedRef.current = false;
      cleanupFns.forEach(fn => fn());
    };
  }, []); // Run once on mount, not when matchId changes

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
    isReady,
    sendTyping
  };
}

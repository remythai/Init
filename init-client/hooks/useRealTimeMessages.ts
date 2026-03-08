// hooks/useRealTimeMessages.ts
import { socketService, type SocketMessage, type SocketTyping, type SocketConversationUpdate } from '@/services/socket.service';
import { useSocket } from '@/context/SocketContext';
import { useEffect, useCallback, useRef, useState } from 'react';

interface UseRealTimeMessagesOptions {
  matchId?: number | null;
  onNewMessage?: (message: SocketMessage['message'] & { match_id: number }) => void;
  onConversationUpdate?: (data: SocketConversationUpdate) => void;
}

export function useRealTimeMessages(options: UseRealTimeMessagesOptions = {}) {
  const { matchId, onNewMessage, onConversationUpdate } = options;
  const { isConnected, currentUserId } = useSocket();

  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinedRooms = useRef<Set<number>>(new Set());

  // Refs to avoid re-subscribing listeners on every render
  const onNewMessageRef = useRef(onNewMessage);
  const onConversationUpdateRef = useRef(onConversationUpdate);
  const matchIdRef = useRef(matchId);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onConversationUpdateRef.current = onConversationUpdate; }, [onConversationUpdate]);
  useEffect(() => { matchIdRef.current = matchId; }, [matchId]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  // Set up listeners once socket is connected
  useEffect(() => {
    if (!isConnected) return;

    const unsubMessage = socketService.onNewMessage((data: SocketMessage) => {
      if (data.senderId === currentUserIdRef.current) return;
      const currentMatchId = matchIdRef.current;
      if (currentMatchId && data.matchId === currentMatchId && onNewMessageRef.current) {
        onNewMessageRef.current({ ...data.message, match_id: data.matchId });
      }
    });

    const unsubTyping = socketService.onTyping((data: SocketTyping) => {
      if (data.matchId !== matchIdRef.current) return;
      if (data.userId === currentUserIdRef.current) return;
      if (data.isTyping) {
        setTypingUsers(prev => prev.includes(data.userId) ? prev : [...prev, data.userId]);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    });

    const unsubConv = socketService.onConversationUpdate((data: SocketConversationUpdate) => {
      onConversationUpdateRef.current?.(data);
    });

    return () => {
      unsubMessage();
      unsubTyping();
      unsubConv();
    };
  }, [isConnected]);

  // Join/leave chat room when matchId changes
  useEffect(() => {
    if (!matchId || !isConnected) return;

    // Leave previous rooms
    joinedRooms.current.forEach(roomId => {
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

    // Reset typing state for new conversation
    setTypingUsers([]);

    return () => {
      if (matchId) {
        socketService.leaveChat(matchId);
        joinedRooms.current.delete(matchId);
      }
    };
  }, [matchId, isConnected]);

  // Send typing indicator with 3s auto-stop
  const sendTyping = useCallback((typing: boolean) => {
    if (!matchId) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (typing) {
      if (!isTyping) {
        setIsTyping(true);
        socketService.sendTyping(matchId, true);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.sendTyping(matchId, false);
      }, 3000);
    } else {
      setIsTyping(false);
      socketService.sendTyping(matchId, false);
    }
  }, [matchId, isTyping]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return { typingUsers, isTyping, isReady: isConnected, sendTyping };
}

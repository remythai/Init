'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { socketService, SocketConversationUpdate } from '../services/socket.service';
import { matchService } from '../services/match.service';
import { authService } from '../services/auth.service';

interface UnreadMessagesContextType {
  hasUnreadGeneral: boolean;
  hasUnreadForEvent: (eventId: string) => boolean;
  markConversationAsRead: (matchId: number) => void;
  setActiveConversation: (matchId: number | null) => void;
  refresh: () => void;
}

const UnreadMessagesContext = createContext<UnreadMessagesContextType | null>(null);

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const [unreadMatchIds, setUnreadMatchIds] = useState<Set<number>>(new Set());
  const [eventUnreadMap, setEventUnreadMap] = useState<Map<string, Set<number>>>(new Map());
  const pathname = usePathname();

  // Track if socket listeners are set up
  const socketListenersSetup = useRef(false);

  // Mapping match_id -> event_id for real-time updates
  const matchToEventMap = useRef<Map<number, string>>(new Map());

  // Track the currently active/viewed conversation
  const activeConversationRef = useRef<number | null>(null);

  // Load unread status from API
  const loadUnreadStatus = useCallback(async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      // Only load for users, not orgas
      const userType = authService.getUserType();
      if (userType !== 'user') return;

      const conversations = await matchService.getAllConversations();

      const newUnreadMatchIds = new Set<number>();
      const newEventUnreadMap = new Map<string, Set<number>>();
      const newMatchToEventMap = new Map<number, string>();

      conversations.forEach((eventGroup) => {
        const eventId = String(eventGroup.event.id);
        const eventUnreads = new Set<number>();

        eventGroup.conversations.forEach((conv) => {
          // Store mapping for all conversations
          newMatchToEventMap.set(conv.match_id, eventId);

          if (conv.unread_count > 0) {
            newUnreadMatchIds.add(conv.match_id);
            eventUnreads.add(conv.match_id);
          }
        });

        if (eventUnreads.size > 0) {
          newEventUnreadMap.set(eventId, eventUnreads);
        }
      });

      setUnreadMatchIds(newUnreadMatchIds);
      setEventUnreadMap(newEventUnreadMap);
      matchToEventMap.current = newMatchToEventMap;
    } catch (error) {
      // Silent fail
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadUnreadStatus();
  }, [loadUnreadStatus]);

  // Reload when navigating
  useEffect(() => {
    loadUnreadStatus();
  }, [pathname, loadUnreadStatus]);

  // Ref to store cleanup function
  const cleanupRef = useRef<(() => void) | null>(null);

  // Setup socket and listeners
  const setupSocket = useCallback(() => {
    const token = authService.getToken();
    if (!token) return;

    // Only for users, not orgas
    const userType = authService.getUserType();
    if (userType !== 'user') return;

    // Skip if listeners are already set up
    if (socketListenersSetup.current) return;

    // Connect to socket
    const socket = socketService.connect(token);
    socketListenersSetup.current = true;

    console.log('UnreadMessagesContext: Setting up socket listeners');

    // Handler for conversation updates
    const handleConversationUpdate = (data: SocketConversationUpdate) => {
      console.log('UnreadMessagesContext: Received conversationUpdate', data);
      const matchId = data.match_id;

      // Don't mark as unread if this is the currently active conversation
      if (activeConversationRef.current === matchId) {
        return;
      }

      // Add this match to unread set
      setUnreadMatchIds((prev) => new Set([...prev, matchId]));

      // Also update eventUnreadMap using our mapping
      const eventId = matchToEventMap.current.get(matchId);
      if (eventId) {
        setEventUnreadMap((prev) => {
          const newMap = new Map(prev);
          const eventUnreads = newMap.get(eventId) || new Set();
          eventUnreads.add(matchId);
          newMap.set(eventId, eventUnreads);
          return newMap;
        });
      } else {
        // If we don't have this match in our mapping, refresh to get the latest data
        loadUnreadStatus();
      }
    };

    // Handler for new matches - refresh to get the mapping
    const handleNewMatch = () => {
      console.log('UnreadMessagesContext: Received new match');
      loadUnreadStatus();
    };

    // Handle socket reconnection - refresh data when reconnected
    const handleConnect = () => {
      console.log('UnreadMessagesContext: Socket connected/reconnected');
      loadUnreadStatus();
    };

    // Subscribe to events
    socket.on('chat:conversationUpdate', handleConversationUpdate);
    socket.on('match:new', handleNewMatch);
    socket.on('connect', handleConnect);

    // Store cleanup function
    cleanupRef.current = () => {
      socket.off('chat:conversationUpdate', handleConversationUpdate);
      socket.off('match:new', handleNewMatch);
      socket.off('connect', handleConnect);
      socketListenersSetup.current = false;
    };

    // Load initial status
    loadUnreadStatus();
  }, [loadUnreadStatus]);

  // Try to setup socket on mount and pathname changes (handles post-login navigation)
  useEffect(() => {
    setupSocket();
  }, [setupSocket, pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  // Mark a conversation as read
  const markConversationAsRead = useCallback((matchId: number) => {
    setUnreadMatchIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(matchId);
      return newSet;
    });

    setEventUnreadMap((prev) => {
      const newMap = new Map(prev);
      newMap.forEach((matchIds, eventId) => {
        if (matchIds.has(matchId)) {
          const newMatchIds = new Set(matchIds);
          newMatchIds.delete(matchId);
          if (newMatchIds.size === 0) {
            newMap.delete(eventId);
          } else {
            newMap.set(eventId, newMatchIds);
          }
        }
      });
      return newMap;
    });
  }, []);

  // Set the active conversation (to prevent marking new messages as unread)
  const setActiveConversation = useCallback((matchId: number | null) => {
    activeConversationRef.current = matchId;
  }, []);

  // Check if there are unread messages for a specific event
  const hasUnreadForEvent = useCallback((eventId: string) => {
    return eventUnreadMap.has(eventId);
  }, [eventUnreadMap]);

  const value: UnreadMessagesContextType = {
    hasUnreadGeneral: unreadMatchIds.size > 0,
    hasUnreadForEvent,
    markConversationAsRead,
    setActiveConversation,
    refresh: loadUnreadStatus,
  };

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessagesContext() {
  const context = useContext(UnreadMessagesContext);
  if (!context) {
    throw new Error('useUnreadMessagesContext must be used within UnreadMessagesProvider');
  }
  return context;
}

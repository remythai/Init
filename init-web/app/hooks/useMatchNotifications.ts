'use client';

import { useEffect, useCallback, useRef } from 'react';
import { socketService, SocketMatch, SocketUserJoined } from '../services/socket.service';
import { authService } from '../services/auth.service';

interface UseMatchNotificationsOptions {
  eventId?: number | string | null;
  onNewMatch?: (match: SocketMatch) => void;
  onUserJoined?: (data: SocketUserJoined) => void;
}

/**
 * Hook for match and event notifications
 * Handles receiving new match notifications and user joined events
 */
export function useMatchNotifications(options: UseMatchNotificationsOptions = {}) {
  const { eventId, onNewMatch, onUserJoined } = options;
  const isConnected = useRef(false);
  const joinedEvents = useRef<Set<string>>(new Set());

  // Initialize connection
  useEffect(() => {
    const init = () => {
      const token = authService.getToken();
      if (!token) return;

      // Connect socket if not connected
      if (!socketService.isConnected()) {
        socketService.connect(token);
      }
      isConnected.current = true;
    };

    init();
  }, []);

  // Join/leave event room when eventId changes
  useEffect(() => {
    if (!eventId || !isConnected.current) return;

    const eventKey = String(eventId);

    // Leave previous event rooms
    joinedEvents.current.forEach((roomId) => {
      if (roomId !== eventKey) {
        socketService.leaveEvent(roomId);
        joinedEvents.current.delete(roomId);
      }
    });

    // Join new event room
    if (!joinedEvents.current.has(eventKey)) {
      socketService.joinEvent(eventId);
      joinedEvents.current.add(eventKey);
    }

    return () => {
      if (eventId) {
        socketService.leaveEvent(eventId);
        joinedEvents.current.delete(eventKey);
      }
    };
  }, [eventId]);

  // Listen for new matches
  useEffect(() => {
    if (!isConnected.current) return;

    const unsubscribe = socketService.onNewMatch((data: SocketMatch) => {
      // Filter by event if specified
      if (eventId && data.event_id !== Number(eventId)) return;

      if (onNewMatch) {
        onNewMatch(data);
      }
    });

    return unsubscribe;
  }, [eventId, onNewMatch]);

  // Listen for users joining event
  useEffect(() => {
    if (!isConnected.current || !eventId) return;

    const unsubscribe = socketService.onUserJoinedEvent((data: SocketUserJoined) => {
      // Filter by current event
      if (data.eventId !== Number(eventId)) return;

      if (onUserJoined) {
        onUserJoined(data);
      }
    });

    return unsubscribe;
  }, [eventId, onUserJoined]);

  return {};
}

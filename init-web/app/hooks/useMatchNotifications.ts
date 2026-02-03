'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [isReady, setIsReady] = useState(false);
  const joinedEvents = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  // Initialize connection
  useEffect(() => {
    mountedRef.current = true;
    let cleanupFn: (() => void) | undefined;

    const init = async () => {
      const token = authService.getToken();
      if (!token) {
        console.log('useMatchNotifications: No token available');
        return;
      }

      // Connect socket if not connected
      let socket = socketService.getSocket();
      if (!socketService.isConnected()) {
        console.log('useMatchNotifications: Connecting socket...');
        socket = socketService.connect(token);
      }

      // If already connected, set ready immediately
      if (socketService.isConnected()) {
        console.log('useMatchNotifications: Already connected');
        if (mountedRef.current) setIsReady(true);
        return;
      }

      // Wait for connection event
      const handleConnect = () => {
        if (mountedRef.current) {
          console.log('useMatchNotifications: Socket connected via event');
          setIsReady(true);
        }
      };

      socket?.on('connect', handleConnect);

      // Also check after a delay as fallback
      const timeout = setTimeout(() => {
        if (mountedRef.current && socketService.isConnected()) {
          console.log('useMatchNotifications: Socket ready (fallback check)');
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

  // Join/leave event room when eventId changes
  useEffect(() => {
    console.log('useMatchNotifications: Event room effect', { eventId, isReady });
    if (!eventId || !isReady) {
      console.log('useMatchNotifications: Skipping event join - eventId:', eventId, 'isReady:', isReady);
      return;
    }

    const eventKey = String(eventId);

    // Leave previous event rooms
    joinedEvents.current.forEach((roomId) => {
      if (roomId !== eventKey) {
        console.log('useMatchNotifications: Leaving previous event room', roomId);
        socketService.leaveEvent(roomId);
        joinedEvents.current.delete(roomId);
      }
    });

    // Join new event room
    if (!joinedEvents.current.has(eventKey)) {
      console.log('useMatchNotifications: Joining event room', eventKey);
      socketService.joinEvent(eventId);
      joinedEvents.current.add(eventKey);
    }

    return () => {
      if (eventId) {
        console.log('useMatchNotifications: Cleanup - leaving event room', eventId);
        socketService.leaveEvent(eventId);
        joinedEvents.current.delete(eventKey);
      }
    };
  }, [eventId, isReady]);

  // Listen for new matches
  useEffect(() => {
    if (!isReady || !onNewMatch) return;

    console.log('useMatchNotifications: Setting up match listener');
    const unsubscribe = socketService.onNewMatch((data: SocketMatch) => {
      console.log('useMatchNotifications: Received match:new', data);
      // Filter by event if specified
      if (eventId && data.event_id !== Number(eventId)) return;

      onNewMatch(data);
    });

    return unsubscribe;
  }, [eventId, onNewMatch, isReady]);

  // Listen for users joining event
  useEffect(() => {
    if (!isReady || !eventId || !onUserJoined) return;

    console.log('useMatchNotifications: Setting up userJoined listener');
    const unsubscribe = socketService.onUserJoinedEvent((data: SocketUserJoined) => {
      console.log('useMatchNotifications: Received event:userJoined', data);
      // Filter by current event
      if (data.eventId !== Number(eventId)) return;

      onUserJoined(data);
    });

    return unsubscribe;
  }, [eventId, onUserJoined, isReady]);

  return { isReady };
}

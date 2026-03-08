// services/socket.service.ts
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface SocketMessage {
  matchId: number;
  message: {
    id: number;
    content: string;
    sender_id: number;
    sent_at: string;
    read_at?: string;
    is_liked?: boolean;
  };
  senderId: number;
}

export interface SocketMatch {
  match_id: number;
  event_id: number;
  event_name: string;
  created_at: string;
  user1: {
    id: number;
    firstname: string;
    lastname: string;
    photos?: { id: number; file_path: string }[];
  };
  user2: {
    id: number;
    firstname: string;
    lastname: string;
    photos?: { id: number; file_path: string }[];
  };
}

export interface SocketTyping {
  matchId: number;
  userId: number;
  isTyping: boolean;
}

export interface SocketConversationUpdate {
  match_id: number;
  last_message: {
    content: string;
    sent_at: string;
    is_mine: boolean;
  };
}

export interface SocketUserJoined {
  eventId: number;
  user: {
    id: number;
    firstname: string;
    lastname: string;
    photos?: { id: number; file_path: string }[];
  };
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Socket {
    if (this.socket) {
      this.socket.auth = { token };
      if (!this.socket.connected) this.socket.connect();
      return this.socket;
    }

    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // On reconnect, re-read the latest token from AsyncStorage
    this.socket.io.on('reconnect_attempt', async () => {
      const freshToken = await AsyncStorage.getItem('token');
      if (freshToken && this.socket) {
        this.socket.auth = { token: freshToken };
      }
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ---- Chat ----

  joinChat(matchId: number): void {
    this.socket?.emit('chat:join', matchId);
  }

  leaveChat(matchId: number): void {
    this.socket?.emit('chat:leave', matchId);
  }

  sendTyping(matchId: number, isTyping: boolean): void {
    this.socket?.emit('chat:typing', { matchId, isTyping });
  }

  markMessageRead(matchId: number, messageId: number): void {
    this.socket?.emit('chat:markRead', { matchId, messageId });
  }

  onNewMessage(callback: (data: SocketMessage) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('chat:newMessage', callback);
    return () => { this.socket?.off('chat:newMessage', callback); };
  }

  onTyping(callback: (data: SocketTyping) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('chat:typing', callback);
    return () => { this.socket?.off('chat:typing', callback); };
  }

  onConversationUpdate(callback: (data: SocketConversationUpdate) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('chat:conversationUpdate', callback);
    return () => { this.socket?.off('chat:conversationUpdate', callback); };
  }

  onMessageRead(callback: (data: { matchId: number; messageId: number; readBy: number }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('chat:messageRead', callback);
    return () => { this.socket?.off('chat:messageRead', callback); };
  }

  // ---- Events ----

  joinEvent(eventId: number | string): void {
    this.socket?.emit('event:join', eventId);
  }

  leaveEvent(eventId: number | string): void {
    this.socket?.emit('event:leave', eventId);
  }

  onUserJoinedEvent(callback: (data: SocketUserJoined) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('event:userJoined', callback);
    return () => { this.socket?.off('event:userJoined', callback); };
  }

  // ---- Match ----

  onNewMatch(callback: (data: SocketMatch) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('match:new', callback);
    return () => { this.socket?.off('match:new', callback); };
  }
}

export const socketService = new SocketService();

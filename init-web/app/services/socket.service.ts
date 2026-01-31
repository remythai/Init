import { io, Socket } from 'socket.io-client';

// Get socket URL - resolved at connection time
const getSocketUrl = (): string => {
  // Use NEXT_PUBLIC_API_URL if available (set at build time)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // In browser, try to use the same host with backend port
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // Default to port 3000 for backend
    return `${protocol}//${hostname}:3000`;
  }

  return 'http://localhost:3000';
};

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

export interface SocketUserJoined {
  eventId: number;
  user: {
    id: number;
    firstname: string;
    lastname: string;
    photos?: { id: number; file_path: string }[];
  };
}

export interface SocketConversationUpdate {
  match_id: number;
  last_message: {
    content: string;
    sent_at: string;
    is_mine: boolean;
  };
}

export interface SocketTyping {
  matchId: number;
  userId: number;
  isTyping: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to the WebSocket server
   */
  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketUrl = getSocketUrl();
    console.log('Connecting to Socket.io at:', socketUrl);

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
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

    return this.socket;
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get the current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // =========================================================================
  // CHAT METHODS
  // =========================================================================

  /**
   * Join a chat room (match conversation)
   */
  joinChat(matchId: number): void {
    this.socket?.emit('chat:join', matchId);
  }

  /**
   * Leave a chat room
   */
  leaveChat(matchId: number): void {
    this.socket?.emit('chat:leave', matchId);
  }

  /**
   * Send typing indicator
   */
  sendTyping(matchId: number, isTyping: boolean): void {
    this.socket?.emit('chat:typing', { matchId, isTyping });
  }

  /**
   * Mark a message as read via socket
   */
  markMessageRead(matchId: number, messageId: number): void {
    this.socket?.emit('chat:markRead', { matchId, messageId });
  }

  /**
   * Listen for new messages
   */
  onNewMessage(callback: (data: SocketMessage) => void): () => void {
    this.socket?.on('chat:newMessage', callback);
    return () => {
      this.socket?.off('chat:newMessage', callback);
    };
  }

  /**
   * Listen for typing indicators
   */
  onTyping(callback: (data: SocketTyping) => void): () => void {
    this.socket?.on('chat:typing', callback);
    return () => {
      this.socket?.off('chat:typing', callback);
    };
  }

  /**
   * Listen for conversation updates
   */
  onConversationUpdate(callback: (data: SocketConversationUpdate) => void): () => void {
    this.socket?.on('chat:conversationUpdate', callback);
    return () => {
      this.socket?.off('chat:conversationUpdate', callback);
    };
  }

  /**
   * Listen for message read events
   */
  onMessageRead(callback: (data: { matchId: number; messageId: number; readBy: number }) => void): () => void {
    this.socket?.on('chat:messageRead', callback);
    return () => {
      this.socket?.off('chat:messageRead', callback);
    };
  }

  // =========================================================================
  // EVENT METHODS
  // =========================================================================

  /**
   * Join an event room
   */
  joinEvent(eventId: number | string): void {
    if (!this.socket?.connected) {
      console.warn('Socket: Cannot join event room - not connected');
      return;
    }
    console.log('Socket: Joining event room', eventId);
    this.socket.emit('event:join', eventId);
  }

  /**
   * Leave an event room
   */
  leaveEvent(eventId: number | string): void {
    if (!this.socket?.connected) {
      console.warn('Socket: Cannot leave event room - not connected');
      return;
    }
    console.log('Socket: Leaving event room', eventId);
    this.socket.emit('event:leave', eventId);
  }

  /**
   * Listen for new users joining event
   */
  onUserJoinedEvent(callback: (data: SocketUserJoined) => void): () => void {
    this.socket?.on('event:userJoined', callback);
    return () => {
      this.socket?.off('event:userJoined', callback);
    };
  }

  // =========================================================================
  // MATCH METHODS
  // =========================================================================

  /**
   * Listen for new matches
   */
  onNewMatch(callback: (data: SocketMatch) => void): () => void {
    this.socket?.on('match:new', callback);
    return () => {
      this.socket?.off('match:new', callback);
    };
  }
}

export const socketService = new SocketService();

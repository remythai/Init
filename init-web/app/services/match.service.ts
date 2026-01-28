// services/match.service.ts
import { authService } from './auth.service';

export interface Photo {
  id: number;
  file_path: string;
}

export interface Profile {
  id?: number;
  user_id: number;
  firstname: string;
  lastname: string;
  birthday?: string;
  age?: number;
  bio?: string;
  interests?: string[];
  photos?: Photo[];
  profil_info?: {
    bio?: string;
    interests?: string[];
    custom_fields?: Record<string, string>;
  } | null;
  custom_fields?: Record<string, string>;
}

export interface Match {
  id: number;
  match_id?: number;
  user: {
    id: number;
    firstname: string;
    lastname: string;
    photos?: Photo[];
  };
  event_id?: number;
  event_name?: string;
  created_at?: string;
}

export interface Conversation {
  match_id: number;
  user: {
    id: number;
    firstname: string;
    lastname: string;
    photos?: Photo[];
  };
  last_message?: {
    content: string;
    sent_at: string;
    is_mine: boolean;
  };
  unread_count: number;
}

export interface Message {
  id: number;
  match_id: number;
  sender_id: number;
  content: string;
  sent_at: string;
  read_at?: string;
  is_liked?: boolean;
}

export interface LikeResponse {
  matched: boolean;
  match?: Match;
}

class MatchService {
  /**
   * Get profiles to swipe for an event
   */
  async getProfilesToSwipe(eventId: string, limit: number = 10): Promise<Profile[]> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/profiles?limit=${limit}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors de la récupération des profils');
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Like a profile
   */
  async likeProfile(eventId: string, userId: number): Promise<LikeResponse> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/like`,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors du like');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Pass on a profile
   */
  async passProfile(eventId: string, userId: number): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/pass`,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors du pass');
    }
  }

  /**
   * Get matches for a specific event
   */
  async getEventMatches(eventId: string): Promise<Match[]> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/matches`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors de la récupération des matchs');
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get all matches across all events
   */
  async getAllMatches(): Promise<{ total: number; by_event: Array<{ event: { id: number; name: string }; matches: Match[] }> }> {
    const response = await authService.authenticatedFetch('/api/matching/');

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors de la récupération des matchs');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get conversations for a specific event
   */
  async getEventConversations(eventId: string): Promise<{ event: { id: number; name: string }; conversations: Conversation[] }> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/conversations`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors de la récupération des conversations');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get all conversations grouped by event
   */
  async getAllConversations(): Promise<Array<{ event: { id: number; name: string }; conversations: Conversation[] }>> {
    const response = await authService.authenticatedFetch('/api/matching/conversations');

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors de la récupération des conversations');
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get messages for a match
   */
  async getMessages(matchId: number, limit: number = 50, beforeId?: number): Promise<{ match: { id: number; event_id: number; event_name: string; user: { id: number; firstname: string; lastname: string; photos?: Photo[] } }; messages: Message[] }> {
    let url = `/api/matching/matches/${matchId}/messages?limit=${limit}`;
    if (beforeId) {
      url += `&before=${beforeId}`;
    }

    const response = await authService.authenticatedFetch(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors de la récupération des messages');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Send a message
   */
  async sendMessage(matchId: number, content: string): Promise<Message> {
    const response = await authService.authenticatedFetch(
      `/api/matching/matches/${matchId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors de l\'envoi du message');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId: number): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/matching/messages/${messageId}/read`,
      { method: 'PUT' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors du marquage du message');
    }
  }

  /**
   * Toggle like on a message
   */
  async toggleMessageLike(messageId: number): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/matching/messages/${messageId}/like`,
      { method: 'PUT' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur');
    }
  }
}

export const matchService = new MatchService();

// services/match.service.ts
import { authService } from './auth.service';

export interface Profile {
  user_id: number;
  firstname: string;
  lastname: string;
  birthday: string;
  profil_info: Record<string, any>;
  photos: Array<{ id: number; file_path: string }>;
}

export interface Match {
  match_id: number;
  created_at: string;
  user_id: number;
  firstname: string;
  lastname: string;
  photos: Array<{ id: number; file_path: string }>;
}

export interface LikeResponse {
  matched: boolean;
  match?: Match;
}

// ✅ Types pour les conversations (comme le web)
export interface Conversation {
  match_id: number;
  user: {
    id: number;
    firstname: string;
    lastname: string;
    photos?: Array<{ id: number; file_path: string }>;
  };
  last_message?: {
    content: string;
    sent_at: string;
    is_mine: boolean;
  };
  unread_count?: number;
  is_blocked?: boolean;
  is_event_expired?: boolean;
  is_other_user_blocked?: boolean;
}

export interface Photo {
  id: number;
  file_path: string;
  is_primary?: boolean;
}

export interface MatchUserProfile {
  id: number;
  firstname: string;
  lastname: string;
  birthday?: string;
  photos?: Photo[];
  profil_info?: Record<string, any>;
}

class MatchService {
  async getProfiles(eventId: number, limit: number = 10): Promise<Profile[]> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/profiles?limit=${limit}`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors du chargement des profils');
    }
    const json = await response.json();
    return json.data;
  }

  async likeProfile(eventId: number, userId: number): Promise<LikeResponse> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/like`,
      { method: 'POST', body: JSON.stringify({ user_id: userId }) }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors du like');
    }
    const json = await response.json();
    return json.data;
  }

  async passProfile(eventId: number, userId: number): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/pass`,
      { method: 'POST', body: JSON.stringify({ user_id: userId }) }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors du pass');
    }
  }

  async getEventMatches(eventId: number): Promise<Match[]> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/matches`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors du chargement des matchs');
    }
    const json = await response.json();
    return json.data;
  }

  // ✅ NOUVEAU : conversations enrichies (last_message, unread, photos)
  async getEventConversations(eventId: string | number): Promise<{ conversations: Conversation[] }> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/conversations`
    );
    if (!response.ok) {
      // Fallback : si l'endpoint n'existe pas, construire depuis getEventMatches
      const matches = await this.getEventMatches(Number(eventId));
      const conversations: Conversation[] = matches.map(m => ({
        match_id: m.match_id,
        user: {
          id: m.user_id,
          firstname: m.firstname,
          lastname: m.lastname,
          photos: m.photos,
        },
        unread_count: 0,
      }));
      return { conversations };
    }
    const json = await response.json();
    // Supporter { data: { conversations } } ou { data: [...] }
    const raw = json.data;
    if (Array.isArray(raw)) return { conversations: raw };
    return raw;
  }

  async getMessages(matchId: number) {
    const res = await authService.authenticatedFetch(
      `/api/matching/matches/${matchId}/messages`
    );
    if (!res.ok) throw new Error('Erreur chargement messages');
    const json = await res.json();
    return json.data; // { match, messages }
  }

  async sendMessage(matchId: number, content: string) {
    const res = await authService.authenticatedFetch(
      `/api/matching/matches/${matchId}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) }
    );
    if (!res.ok) throw new Error('Erreur envoi message');
    const json = await res.json();
    return json.data;
  }

  async toggleMessageLike(messageId: number): Promise<void> {
    const res = await authService.authenticatedFetch(
      `/api/matching/messages/${messageId}/like`,
      { method: 'PUT' }
    );
    if (!res.ok) throw new Error('Erreur like message');
  }

  // ✅ NOUVEAU : marquer une conversation comme lue
  async markConversationMessagesAsRead(matchId: number): Promise<void> {
    try {
      await authService.authenticatedFetch(
        `/api/matching/matches/${matchId}/read`,
        { method: 'PUT' }
      );
    } catch {
      // Silencieux si l'endpoint n'existe pas encore
    }
  }

  // ✅ NOUVEAU : profil détaillé d'un match
  async getMatchProfile(matchId: number): Promise<MatchUserProfile> {
    const res = await authService.authenticatedFetch(
      `/api/matching/matches/${matchId}/profile`
    );
    if (!res.ok) throw new Error('Erreur chargement profil');
    const json = await res.json();
    return json.data;
  }

  // ✅ NOUVEAU : toutes conversations groupées par événement (messagerie globale)
  async getAllConversations(): Promise<{ event: { id: number; name: string }; conversations: Conversation[] }[]> {
    const response = await authService.authenticatedFetch('/api/matching/conversations');
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur chargement conversations globales');
    }
    const json = await response.json();
    const raw = json.data;
    // Supporter { data: [...] } ou { data: { conversations: [...] } }
    if (Array.isArray(raw)) return raw;
    return raw.conversations || raw;
  }
}

export const matchService = new MatchService();
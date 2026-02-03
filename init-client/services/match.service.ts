// services/match.service.ts (CORRIGÉ)
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

class MatchService {
  async getProfiles(eventId: number, limit: number = 10): Promise<Profile[]> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/profiles?limit=${limit}`  // ✅ /matching
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Profiles error:', error);  // 🔍 DEBUG
      throw new Error(error.error || 'Erreur lors du chargement des profils');
    }

    const json = await response.json();
    return json.data;
  }

  async likeProfile(eventId: number, userId: number): Promise<LikeResponse> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/like`,  // ✅ /matching
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }
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
      `/api/matching/events/${eventId}/pass`,  // ✅ /matching
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

  async getEventMatches(eventId: number): Promise<Match[]> {
    const response = await authService.authenticatedFetch(
      `/api/matching/events/${eventId}/matches`  // ✅ /matching
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erreur lors du chargement des matchs');
    }

    const json = await response.json();
    return json.data;
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
    return json.data; // message créé
  }

}



export const matchService = new MatchService();

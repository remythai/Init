// services/event.service.ts
import { authService } from './auth.service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface EventResponse {
  id: number;
  name: string;
  location: string;
  max_participants: number;
  event_date: string | null;
  start_at?: string;
  description?: string;
  participant_count?: number | string;
  is_registered?: boolean;
  custom_fields?: CustomField[];
  orga_name?: string;
}

export interface CustomField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export interface EventListResponse {
  events: EventResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface Event {
  id: string;
  name: string;
  theme: string;
  date: string;
  location: string;
  participants: number;
  maxParticipants: number;
  image: string;
  description?: string;
  isRegistered?: boolean;
}

class EventService {
  async getPublicEvents(filters?: {
    upcoming?: boolean;
    location?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<EventListResponse> {
    const params = new URLSearchParams();

    if (filters?.upcoming !== undefined) {
      params.append('upcoming', String(filters.upcoming));
    }
    if (filters?.location) {
      params.append('location', filters.location);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.limit) {
      params.append('limit', String(filters.limit));
    }
    if (filters?.offset) {
      params.append('offset', String(filters.offset));
    }

    const response = await authService.authenticatedFetch(
      `/api/events/users/list?${params.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erreur lors de la récupération des événements');
    }

    const data = await response.json();
    return data.data;
  }

  async getMyRegisteredEvents(filters?: {
    upcoming?: boolean;
    past?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<EventListResponse> {
    const params = new URLSearchParams();

    if (filters?.upcoming !== undefined) {
      params.append('upcoming', String(filters.upcoming));
    }
    if (filters?.past !== undefined) {
      params.append('past', String(filters.past));
    }
    if (filters?.limit) {
      params.append('limit', String(filters.limit));
    }
    if (filters?.offset) {
      params.append('offset', String(filters.offset));
    }

    const response = await authService.authenticatedFetch(
      `/api/events/users/my-events?${params.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erreur lors de la récupération de vos événements');
    }

    const data = await response.json();
    return data.data;
  }

  async getMyOrgaEvents(): Promise<EventResponse[]> {
    const response = await authService.authenticatedFetch('/api/events/orga/my-events');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erreur lors de la récupération de vos événements');
    }

    const data = await response.json();
    return data.data;
  }

  async registerToEvent(eventId: string, data?: { profil_info?: unknown; access_password?: string }) {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/register`,
      {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || "Erreur lors de l'inscription");
    }
  }

  async unregisterFromEvent(eventId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/register`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la désinscription');
    }
  }

  async createEvent(eventData: {
    name: string;
    description?: string;
    start_at: string;
    end_at: string;
    location: string;
    max_participants?: number;
    is_public?: boolean;
    has_whitelist?: boolean;
    has_link_access?: boolean;
    has_password_access?: boolean;
    access_password?: string;
    cooldown?: string;
    custom_fields?: CustomField[];
  }): Promise<EventResponse> {
    const response = await authService.authenticatedFetch('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || "Erreur lors de la création de l'événement");
    }

    const data = await response.json();
    return data.data;
  }
}

// Utility functions
export function formatEventDate(isoDate: string | null): string {
  if (!isoDate) return 'Date à confirmer';

  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function inferTheme(name: string, description?: string): string {
  const text = `${name} ${description || ''}`.toLowerCase();

  if (text.includes('jazz') || text.includes('concert') || text.includes('musique')) {
    return 'musique';
  }
  if (text.includes('networking') || text.includes('startup') || text.includes('professionnel')) {
    return 'professionnel';
  }
  if (text.includes('étudiant') || text.includes('campus') || text.includes('université')) {
    return 'étudiant';
  }
  if (text.includes('sport') || text.includes('football') || text.includes('match')) {
    return 'sport';
  }
  if (text.includes('café') || text.includes('brunch') || text.includes('coffee')) {
    return 'café';
  }
  if (text.includes('fête') || text.includes('soirée') || text.includes('party')) {
    return 'fête';
  }

  return 'général';
}

export function getDefaultImage(theme: string): string {
  const images: Record<string, string> = {
    musique: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    professionnel: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800',
    étudiant: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800',
    sport: 'https://images.unsplash.com/photo-1461896836934- voices?w=800',
    café: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    fête: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
    général: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  };
  return images[theme] || images.général;
}

export function transformEventResponse(event: EventResponse): Event {
  const theme = inferTheme(event.name, event.description);
  return {
    id: String(event.id),
    name: event.name,
    theme,
    date: formatEventDate(event.event_date || event.start_at || null),
    location: event.location || 'Lieu à confirmer',
    participants: typeof event.participant_count === 'string'
      ? parseInt(event.participant_count, 10)
      : event.participant_count || 0,
    maxParticipants: event.max_participants || 50,
    image: getDefaultImage(theme),
    description: event.description,
    isRegistered: event.is_registered,
  };
}

export function transformEventResponses(events: EventResponse[]): Event[] {
  return events.map(transformEventResponse);
}

export const eventService = new EventService();

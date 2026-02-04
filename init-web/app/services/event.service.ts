// services/event.service.ts
import { authService } from './auth.service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface EventResponse {
  id: number;
  name: string;
  location?: string;
  max_participants: number;
  event_date: string | null;
  start_at?: string;  // Physical event start
  end_at?: string;    // Physical event end
  app_start_at?: string;  // App availability start
  app_end_at?: string;    // App availability end
  theme?: string;  // Event theme
  description?: string;
  participant_count?: number | string;
  is_registered?: boolean;
  is_blocked?: boolean;
  is_public?: boolean;
  has_whitelist?: boolean;
  has_link_access?: boolean;
  has_password_access?: boolean;
  cooldown?: string;
  custom_fields?: CustomField[];
  orga_name?: string;
  orga_logo?: string;
  banner_path?: string;
}

export interface CustomField {
  label: string;  // Question/label affiché et utilisé comme identifiant
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'checkbox' | 'radio' | 'select' | 'multiselect';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];  // Liste simple de choix pour radio/select/multiselect
}

// Génère un placeholder par défaut basé sur le type de champ
export function getFieldPlaceholder(field: CustomField): string {
  switch (field.type) {
    case 'email':
      return 'exemple@email.com';
    case 'phone':
      return '06 12 34 56 78';
    case 'number':
      return '0';
    case 'textarea':
      return 'Votre réponse...';
    case 'text':
    default:
      return 'Votre réponse';
  }
}

// Génère un identifiant stable à partir du label
export function getFieldId(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Supprime les accents
    .replace(/[^a-z0-9\s]/g, '')       // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, '_');             // Remplace espaces par underscore
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
  // Physical event (optional)
  physicalDate: string;  // Formatted date string for display
  startAt?: string;  // ISO date string
  endAt?: string;  // ISO date string
  location?: string;
  hasPhysicalEvent: boolean;
  // App availability (required)
  appDate: string;  // Formatted date string for display
  appStartAt: string;  // ISO date string
  appEndAt: string;  // ISO date string
  // Other
  participants: number;
  maxParticipants: number;
  image: string;
  description?: string;
  isRegistered?: boolean;
  isBlocked?: boolean;
  customFields?: CustomField[];
  orgaName?: string;
  orgaLogo?: string;
  hasWhitelist?: boolean;
  bannerPath?: string;
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

    const url = `/api/events/users/list?${params.toString()}`;
    console.log('Fetching public events from:', url);

    const response = await authService.authenticatedFetch(url);
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error fetching events:', errorData);
      throw new Error(errorData.error || errorData.message || 'Erreur lors de la récupération des événements');
    }

    const data = await response.json();
    console.log('Events data:', data);
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

  async checkEligibility(eventId: string): Promise<{
    eligible: boolean;
    reason?: string;
    message?: string;
    requires_password?: boolean;
    custom_fields?: CustomField[];
  }> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/check-eligibility`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || "Erreur lors de la vérification");
    }

    const result = await response.json();
    return result.data;
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
    // Physical event (optional)
    start_at?: string;
    end_at?: string;
    location?: string;
    // App availability (required)
    app_start_at: string;
    app_end_at: string;
    // Theme
    theme?: string;
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

  async getEventById(id: string): Promise<EventResponse> {
    const userType = authService.getUserType();
    const endpoint = userType === 'orga'
      ? `/api/events/${id}`
      : `/api/events/users/list`;

    const response = await authService.authenticatedFetch(endpoint);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Événement non trouvé');
    }

    const data = await response.json();
    if (userType === 'orga') {
      return data.data;
    }

    const event = data.data.events.find((e: EventResponse) => e.id === parseInt(id));
    if (!event) {
      throw new Error('Événement non trouvé');
    }

    return event;
  }

  async updateEvent(eventId: string, updates: Partial<{
    name: string;
    description: string;
    // Physical event (optional)
    start_at: string;
    end_at: string;
    location: string;
    // App availability (required)
    app_start_at: string;
    app_end_at: string;
    max_participants: number;
    is_public: boolean;
    has_whitelist: boolean;
    has_link_access: boolean;
    has_password_access: boolean;
    access_password: string;
    cooldown: string;
    custom_fields: CustomField[];
  }>): Promise<EventResponse> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la mise à jour');
    }

    const data = await response.json();
    return data.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la suppression');
    }
  }

  async getMyEventProfile(eventId: string): Promise<{
    profil_info: Record<string, unknown>;
    custom_fields: CustomField[];
  }> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/my-profile`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la recuperation du profil');
    }

    const data = await response.json();
    return data.data;
  }

  async updateMyEventProfile(eventId: string, profilInfo: Record<string, unknown>): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/register`,
      {
        method: 'PUT',
        body: JSON.stringify({ profil_info: profilInfo }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la mise a jour du profil');
    }
  }

  async getBlockedUsers(eventId: string): Promise<BlockedUser[]> {
    const response = await authService.authenticatedFetch(`/api/events/${eventId}/blocked`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la récupération des utilisateurs bloqués');
    }

    const data = await response.json();
    return data.data || [];
  }

  async unblockUser(eventId: string, userId: number): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/blocked/${userId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors du déblocage');
    }
  }

  async removeParticipant(eventId: string, userId: number, action: 'block' | 'delete' = 'block'): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/participants/${userId}?action=${action}`,
      {
        method: 'DELETE'
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la suppression du participant');
    }
  }

  async blockUser(eventId: string, userId: number, reason?: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/blocked`,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reason })
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors du blocage');
    }
  }

  async getEventStatistics(eventId: string): Promise<EventStatistics> {
    const response = await authService.authenticatedFetch(`/api/events/${eventId}/statistics`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la récupération des statistiques');
    }

    const data = await response.json();
    return data.data.statistics;
  }

  async uploadEventBanner(eventId: string, file: File): Promise<string> {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No token available');
    }

    const formData = new FormData();
    formData.append('banner', file);

    const response = await fetch(`${API_URL}/api/events/${eventId}/banner`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erreur lors de l\'upload de la bannière');
    }

    const data = await response.json();
    return data.data.banner_path;
  }

  async deleteEventBanner(eventId: string): Promise<void> {
    const response = await authService.authenticatedFetch(`/api/events/${eventId}/banner`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erreur lors de la suppression de la bannière');
    }
  }
}

export interface BlockedUser {
  id: number;
  event_id: number;
  user_id: number;
  blocked_at: string;
  reason: string | null;
  firstname: string;
  lastname: string;
  mail: string;
  tel: string;
}

export interface EventStatistics {
  participants: {
    total: number;
    active: number;
    engagement_rate: number;
  };
  whitelist: {
    total: number;
    registered: number;
    pending: number;
    removed: number;
    conversion_rate: number;
  };
  matching: {
    total_matches: number;
    average_matches_per_user: number;
    reciprocity_rate: number;
  };
  swipes: {
    total: number;
    likes: number;
    passes: number;
    users_who_swiped: number;
    like_rate: number;
  };
  messages: {
    total: number;
    users_who_sent: number;
    conversations_active: number;
    average_per_conversation: number;
  };
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

export function formatEventDateRange(startAt: string | null | undefined, endAt: string | null | undefined): string {
  if (!startAt) return 'Date à confirmer';

  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;

  const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Same day
  if (end && start.toDateString() === end.toDateString()) {
    return `${formatDate(start)}, ${formatTime(start)} - ${formatTime(end)}`;
  }

  // Multiple days
  if (end) {
    return `Du ${formatDate(start)} à ${formatTime(start)} au ${formatDate(end)} à ${formatTime(end)}`;
  }

  // Only start date
  return `${formatDate(start)} à ${formatTime(start)}`;
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
  // Use theme from backend if available, otherwise infer from name/description
  const theme = event.theme || inferTheme(event.name, event.description);
  const hasPhysicalEvent = !!(event.start_at || event.location);

  // Use custom banner if available, otherwise fall back to theme-based image
  const image = event.banner_path
    ? `${API_URL}${event.banner_path}`
    : getDefaultImage(theme);

  // Build orga logo URL if available
  const orgaLogo = event.orga_logo
    ? `${API_URL}${event.orga_logo}`
    : undefined;

  return {
    id: String(event.id),
    name: event.name,
    theme,
    // Physical event (optional)
    physicalDate: formatEventDateRange(event.start_at, event.end_at),
    startAt: event.start_at || undefined,
    endAt: event.end_at || undefined,
    location: event.location || undefined,
    hasPhysicalEvent,
    // App availability (required)
    appDate: formatEventDateRange(event.app_start_at, event.app_end_at),
    appStartAt: event.app_start_at || '',
    appEndAt: event.app_end_at || '',
    // Other
    participants: typeof event.participant_count === 'string'
      ? parseInt(event.participant_count, 10)
      : event.participant_count || 0,
    maxParticipants: event.max_participants || 50,
    image,
    description: event.description,
    isRegistered: event.is_registered,
    isBlocked: event.is_blocked,
    customFields: event.custom_fields,
    orgaName: event.orga_name,
    orgaLogo,
    hasWhitelist: event.has_whitelist,
    bannerPath: event.banner_path,
  };
}

export function transformEventResponses(events: EventResponse[]): Event[] {
  return events.map(transformEventResponse);
}

export const eventService = new EventService();

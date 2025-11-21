// services/event.service.ts
import { authService } from './auth.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface EventResponse {
  id: number;
  name: string;
  description: string;
  start_at: string;
  end_at: string;
  location: string;
  max_participants: number;
  is_public: boolean;
  orga_name?: string;
  participant_count: number;
  is_registered?: boolean;
  custom_fields?: any[];
}

export interface EventListResponse {
  events: EventResponse[];
  total: number;
  limit: number;
  offset: number;
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
      `/api/events/users/list?${params.toString()}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData);
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
      `/api/events/users/my-events?${params.toString()}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData);
      throw new Error(errorData.error || errorData.message || 'Erreur lors de la récupération de vos événements');
    }

    const data = await response.json();
    return data.data;
  }

  async getMyOrgaEvents(): Promise<EventResponse[]> {
    const response = await authService.authenticatedFetch(
      '/api/events/orga/my-events',
      { method: 'GET' }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData);
      throw new Error(errorData.error || errorData.message || 'Erreur lors de la récupération de vos événements');
    }

    const data = await response.json();
    return data.data;
  }

  async getEventById(id: string): Promise<EventResponse> {
    const userType = await authService.getUserType();
    const endpoint = userType === 'orga' 
      ? `/api/events/${id}`
      : `/api/events/users/list`;

    const response = await authService.authenticatedFetch(endpoint, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData);
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

  async registerToEvent(eventId: string, data?: { profil_info?: any; access_password?: string }) {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/register`,
      {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      }
    );
  
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Register error:', error);
      throw new Error(error.error || error.message || 'Erreur lors de l\'inscription');
    }
  }
  

  async unregisterFromEvent(eventId: string): Promise<void> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/register`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Unregister error:', error);
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
    custom_fields?: any[];
  }): Promise<EventResponse> {
    const response = await authService.authenticatedFetch(
      '/api/events',
      {
        method: 'POST',
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Create event error:', error);
      throw new Error(error.error || error.message || 'Erreur lors de la création de l\'événement');
    }

    const data = await response.json();
    return data.data;
  }

  async updateEvent(eventId: string, updates: Partial<{
    name: string;
    description: string;
    start_at: string;
    end_at: string;
    location: string;
    max_participants: number;
    is_public: boolean;
    has_whitelist: boolean;
    has_link_access: boolean;
    has_password_access: boolean;
    access_password: string;
    cooldown: string;
    custom_fields: any[];
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
      console.error('Update event error:', error);
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
      console.error('Delete event error:', error);
      throw new Error(error.error || error.message || 'Erreur lors de la suppression');
    }
  }
}

export const eventService = new EventService();
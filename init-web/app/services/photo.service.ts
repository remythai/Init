// services/photo.service.ts

import { authService } from './auth.service';
import { isDevMode } from './dev/dev-mode';
import { MOCK_PHOTOS, MOCK_EVENT_PHOTOS, MOCK_PHOTOS_GROUPED } from './dev/mock-data';

export interface Photo {
  id: number;
  user_id: number;
  file_path: string;
  event_id: number | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhotosGrouped {
  general: Photo[];
  events: {
    [eventId: string]: {
      event_name: string;
      photos: Photo[];
    };
  };
}

class PhotoService {
  /**
   * Get the full URL for a photo
   * file_path is relative like /uploads/photos/...
   * Uses Next.js rewrites to proxy to backend
   */
  getPhotoUrl(filePath: string): string {
    if (!filePath) return '';
    if (isDevMode()) return filePath;
    return filePath;
  }

  /**
   * Upload a photo
   * Uses custom fetch without Content-Type header for FormData
   */
  async uploadPhoto(
    file: File,
    eventId?: string,
    isPrimary?: boolean
  ): Promise<Photo> {
    if (isDevMode()) {
      return { id: Date.now(), user_id: 999, file_path: URL.createObjectURL(file), event_id: eventId ? parseInt(eventId) : null, display_order: 0, is_primary: isPrimary || false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }
    const token = authService.getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    const formData = new FormData();
    formData.append('photo', file);
    if (eventId) {
      formData.append('eventId', eventId);
    }
    if (isPrimary !== undefined) {
      formData.append('isPrimary', String(isPrimary));
    }

    let response: Response;
    try {
      response = await fetch(`/api/users/photos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type - browser sets it with boundary for FormData
        },
        body: formData,
      });
    } catch (networkError) {
      console.error('Network error during upload:', networkError);
      throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      throw new Error('Réponse invalide du serveur');
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de l\'upload');
    }

    return data.data;
  }

  /**
   * Get photos (general or for a specific event)
   */
  async getPhotos(eventId?: string): Promise<Photo[]> {
    if (isDevMode()) return eventId ? MOCK_EVENT_PHOTOS.filter(p => p.event_id === parseInt(eventId)) : MOCK_PHOTOS;
    const url = eventId
      ? `/api/users/photos?eventId=${eventId}`
      : '/api/users/photos';

    const response = await authService.authenticatedFetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de la récupération des photos');
    }

    return data.data || [];
  }

  /**
   * Get all photos grouped by context (general + events)
   */
  async getAllPhotos(): Promise<PhotosGrouped> {
    if (isDevMode()) return MOCK_PHOTOS_GROUPED;
    const response = await authService.authenticatedFetch('/api/users/photos/all');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de la récupération des photos');
    }

    return data.data || { general: [], events: {} };
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: number): Promise<void> {
    if (isDevMode()) return;
    const response = await authService.authenticatedFetch(`/api/users/photos/${photoId}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de la suppression');
    }
  }

  /**
   * Set a photo as primary
   */
  async setPrimaryPhoto(photoId: number): Promise<Photo> {
    if (isDevMode()) {
      const photo = [...MOCK_PHOTOS, ...MOCK_EVENT_PHOTOS].find(p => p.id === photoId);
      if (photo) return { ...photo, is_primary: true };
      return { id: photoId, user_id: 999, file_path: '', event_id: null, display_order: 0, is_primary: true, created_at: '', updated_at: '' };
    }
    const response = await authService.authenticatedFetch(`/api/users/photos/${photoId}/primary`, {
      method: 'PUT',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de la mise à jour');
    }

    return data.data;
  }

  /**
   * Reorder photos
   */
  async reorderPhotos(photoIds: number[], eventId?: string): Promise<Photo[]> {
    if (isDevMode()) return eventId ? MOCK_EVENT_PHOTOS : MOCK_PHOTOS;
    const response = await authService.authenticatedFetch('/api/users/photos/reorder', {
      method: 'PUT',
      body: JSON.stringify({
        photoIds,
        eventId: eventId ? parseInt(eventId) : null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de la réorganisation');
    }

    return data.data || [];
  }

  /**
   * Copy photos to an event
   */
  async copyPhotosToEvent(eventId: string, photoIds?: number[]): Promise<Photo[]> {
    if (isDevMode()) return MOCK_EVENT_PHOTOS;
    const response = await authService.authenticatedFetch('/api/users/photos/copy-to-event', {
      method: 'POST',
      body: JSON.stringify({
        eventId: parseInt(eventId),
        photoIds,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur lors de la copie des photos');
    }

    return data.data || [];
  }

  /**
   * Get the primary photo for a context
   */
  getPrimaryPhoto(photos: Photo[]): Photo | null {
    return photos.find((p) => p.is_primary) || photos[0] || null;
  }
}

export const photoService = new PhotoService();

// services/photo.service.ts

import { authService } from './auth.service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
   */
  getPhotoUrl(filePath: string): string {
    if (!filePath) return '';
    // If already a full URL, return as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    return `${API_URL}${filePath}`;
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
      response = await fetch(`${API_URL}/api/users/photos`, {
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

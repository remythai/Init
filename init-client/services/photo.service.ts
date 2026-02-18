// services/photo.service.ts
import { authService } from './auth.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
  getPhotoUrl(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    return `${API_URL}${filePath}`;
  }

  async uploadPhoto(
    uri: string,
    eventId?: string,
    isPrimary?: boolean
  ): Promise<Photo> {
    const token = await authService.getToken();
    if (!token) throw new Error('Non authentifié');

    const uriLower = uri.toLowerCase();
    let mimeType = 'image/jpeg';
    let fileName = `photo-${Date.now()}.jpg`;

    if (uriLower.includes('.png')) {
      mimeType = 'image/png';
      fileName = `photo-${Date.now()}.png`;
    } else if (uriLower.includes('.webp')) {
      mimeType = 'image/webp';
      fileName = `photo-${Date.now()}.webp`;
    }

    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: fileName,
      type: mimeType,
    } as any);

    if (eventId) formData.append('eventId', eventId);
    if (isPrimary !== undefined) formData.append('isPrimary', String(isPrimary));

    const response = await fetch(`${API_URL}/api/users/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Réponse non-JSON du serveur:', text.substring(0, 200));
      throw new Error(`Erreur serveur (${response.status})`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Erreur lors de l'upload");
    }

    return data.data;
  }

  async getPhotos(eventId?: string): Promise<Photo[]> {
    const url = eventId
      ? `/api/users/photos?eventId=${eventId}`
      : '/api/users/photos';

    const response = await authService.authenticatedFetch(url);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Erreur serveur (${response.status})`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur récupération photos');
    }

    return data.data || [];
  }

  async getAllPhotos(): Promise<PhotosGrouped> {
    const response = await authService.authenticatedFetch('/api/users/photos/all');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur récupération photos');
    }

    return data.data || { general: [], events: {} };
  }

  async deletePhoto(photoId: number): Promise<void> {
    const response = await authService.authenticatedFetch(`/api/users/photos/${photoId}`, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur suppression');
    }
  }

  async setPrimaryPhoto(photoId: number): Promise<Photo> {
    const response = await authService.authenticatedFetch(
      `/api/users/photos/${photoId}/primary`,
      { method: 'PUT' }
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Erreur mise à jour');
    }

    return data.data;
  }

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
      throw new Error(data.error || data.message || 'Erreur réorganisation');
    }

    return data.data || [];
  }

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
      throw new Error(data.error || data.message || 'Erreur copie photos');
    }

    return data.data || [];
  }

  getPrimaryPhoto(photos: Photo[]): Photo | null {
    return photos.find((p) => p.is_primary) || photos[0] || null;
  }
}

export const photoService = new PhotoService();
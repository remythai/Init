// services/whitelist.service.ts
import { authService } from './auth.service';

export interface WhitelistEntry {
  id: number;
  event_id: number;
  phone: string;
  status: 'active' | 'removed';
  source: 'manual' | 'csv' | 'xml';
  user_id?: number;
  created_at: string;
  updated_at: string;
  removed_at?: string;
  // Joined user info
  firstname?: string;
  lastname?: string;
}

export interface ImportStats {
  total: number;
  added: number;
  skipped_duplicate: number;
  skipped_removed: number;
  invalid: number;
  errors: Array<{ phone: string; reason: string }>;
}

class WhitelistService {
  /**
   * Get whitelist entries for an event
   */
  async getWhitelist(eventId: string, includeRemoved = false): Promise<WhitelistEntry[]> {
    const params = new URLSearchParams();
    if (includeRemoved) {
      params.append('include_removed', 'true');
    }

    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors du chargement de la whitelist');
    }

    const data = await response.json();
    // API returns { entries: [...], count: number, event_id: number }
    const entries = data.data?.entries || [];

    // Transform API response to WhitelistEntry format
    return entries.map((entry: {
      id: number;
      phone: string;
      status: 'active' | 'removed';
      source: 'manual' | 'csv' | 'xml';
      user?: { id: number; firstname: string; lastname: string } | null;
      created_at: string;
      removed_at?: string;
    }) => ({
      id: entry.id,
      event_id: parseInt(eventId),
      phone: entry.phone,
      status: entry.status,
      source: entry.source,
      user_id: entry.user?.id,
      firstname: entry.user?.firstname,
      lastname: entry.user?.lastname,
      created_at: entry.created_at,
      removed_at: entry.removed_at,
    }));
  }

  /**
   * Add a single phone to whitelist
   */
  async addPhone(eventId: string, phone: string): Promise<WhitelistEntry> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist`,
      {
        method: 'POST',
        body: JSON.stringify({ phone }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de l\'ajout');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Import phones from a file (CSV or XML)
   */
  async importFile(eventId: string, file: File): Promise<ImportStats> {
    // Read file content
    const content = await this.readFileContent(file);

    // Determine format from extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    let format: 'csv' | 'xml';

    if (extension === 'xml') {
      format = 'xml';
    } else {
      // Default to CSV for .csv, .txt, or any other extension
      format = 'csv';
    }

    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/import`,
      {
        method: 'POST',
        body: JSON.stringify({ content, format }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de l\'import');
    }

    const data = await response.json();
    // API returns { stats: {...}, errors: [...] } inside data.data
    const result = data.data;
    return {
      total: result.stats.total,
      added: result.stats.added,
      skipped_duplicate: result.stats.skipped_duplicate,
      skipped_removed: result.stats.skipped_removed,
      invalid: result.stats.invalid,
      errors: result.errors || [],
    };
  }

  /**
   * Read file content as text
   */
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsText(file);
    });
  }

  /**
   * Update a phone number
   */
  async updatePhone(eventId: string, oldPhone: string, newPhone: string): Promise<WhitelistEntry> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/${encodeURIComponent(oldPhone)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ phone: newPhone }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la modification');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Remove a phone from whitelist (soft or permanent)
   */
  async removePhone(eventId: string, phone: string, permanent = false): Promise<void> {
    const params = new URLSearchParams();
    if (permanent) {
      params.append('permanent', 'true');
    }

    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/${encodeURIComponent(phone)}?${params.toString()}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la suppression');
    }
  }

  /**
   * Reactivate a removed phone
   */
  async reactivatePhone(eventId: string, phone: string): Promise<WhitelistEntry> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/${encodeURIComponent(phone)}/reactivate`,
      { method: 'POST' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la réactivation');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Format phone for display (from E.164)
   */
  formatPhoneDisplay(phone: string): string {
    if (!phone) return '';
    // +33601020304 -> 06 01 02 03 04
    if (phone.startsWith('+33')) {
      const national = '0' + phone.substring(3);
      return national.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    }
    return phone;
  }
}

export const whitelistService = new WhitelistService();

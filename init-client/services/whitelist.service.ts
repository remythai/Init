// services/whitelist.service.ts
import { authService } from './auth.service';

export interface WhitelistEntry {
  id: number;
  event_id: number;
  phone: string;
  status: 'active' | 'removed';
  source: 'manual' | 'csv' | 'xml';
  user_id?: number;
  firstname?: string;
  lastname?: string;
  created_at: string;
  removed_at?: string;
}

export interface ImportStats {
  total: number;
  added: number;
  skipped_duplicate: number;
  skipped_removed: number;
  invalid: number;
  errors: Array<{ phone: string; reason: string }>;
}

export interface CSVPreview {
  headers: Array<{ index: number; name: string }>;
  preview: string[][];
  totalRows: number;
}

export interface BulkRemoveStats {
  total: number;
  removed: number;
  not_found: number;
  errors: Array<{ phone: string; error: string }>;
}

class WhitelistService {
  async getWhitelist(eventId: string, includeRemoved = false): Promise<WhitelistEntry[]> {
    const params = new URLSearchParams();
    if (includeRemoved) params.append('include_removed', 'true');

    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors du chargement de la whitelist');
    }

    const data = await response.json();
    const entries = data.data?.entries || [];

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

  async addPhone(eventId: string, phone: string): Promise<WhitelistEntry> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist`,
      { method: 'POST', body: JSON.stringify({ phone }) }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || "Erreur lors de l'ajout");
    }

    const data = await response.json();
    return data.data;
  }

  async updatePhone(eventId: string, oldPhone: string, newPhone: string): Promise<WhitelistEntry> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/${encodeURIComponent(oldPhone)}`,
      { method: 'PUT', body: JSON.stringify({ phone: newPhone }) }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la modification');
    }

    const data = await response.json();
    return data.data;
  }

  async removePhone(eventId: string, phone: string, permanent = false): Promise<void> {
    const params = new URLSearchParams();
    if (permanent) params.append('permanent', 'true');

    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/${encodeURIComponent(phone)}?${params.toString()}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la suppression');
    }
  }

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

  async previewCSV(eventId: string, content: string): Promise<CSVPreview> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/import/preview`,
      { method: 'POST', body: JSON.stringify({ content }) }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la prévisualisation');
    }

    const data = await response.json();
    return data.data;
  }

  async importContent(eventId: string, content: string, format: 'csv' | 'xml', columnIndex?: number): Promise<ImportStats> {
    const body: { content: string; format: string; columnIndex?: number } = { content, format };
    if (columnIndex !== undefined) body.columnIndex = columnIndex;

    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/import`,
      { method: 'POST', body: JSON.stringify(body) }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || "Erreur lors de l'import");
    }

    const data = await response.json();
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

  async bulkRemove(eventId: string, phones: string[], permanent = false): Promise<BulkRemoveStats> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/whitelist/bulk`,
      { method: 'DELETE', body: JSON.stringify({ phones, permanent }) }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la suppression en masse');
    }

    const data = await response.json();
    return data.data.stats;
  }

  formatPhoneDisplay(phone: string): string {
    if (!phone) return '';
    if (phone.startsWith('+33')) {
      const national = '0' + phone.substring(3);
      return national.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    }
    return phone;
  }
}

export const whitelistService = new WhitelistService();

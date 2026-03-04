// services/report.service.ts
import { authService } from './auth.service';

export type ReportType = 'photo' | 'profile' | 'message';
export type ReportReason = 'inappropriate' | 'harassment' | 'spam' | 'fake' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface Report {
  id: number;
  report_type: ReportType;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  has_match?: boolean;
  match_id?: number;
  reporter: {
    id: number;
    firstname: string;
    lastname: string;
  };
  reported_user: {
    id: number;
    firstname: string;
    lastname: string;
    total_reports?: number;
  };
  orga_notes?: string;
  created_at: string;
  reviewed_at?: string;
  resolved_at?: string;
}

export interface ReportStats {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
  by_type: {
    photo: number;
    profile: number;
    message: number;
  };
}

export interface ReportMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  sent_at: string;
}

export interface ReportPhoto {
  id: number;
  file_path: string;
  is_primary: boolean;
}

export interface ReportProfileInfo {
  firstname: string;
  lastname: string;
  birthday: string;
  custom_fields: Record<string, string | number | boolean>;
}

export interface ReportDetails extends Report {
  event: {
    id: number;
    name: string;
  };
  messages?: ReportMessage[];
  photos?: ReportPhoto[];
  profile_info?: ReportProfileInfo;
}

export interface CreateReportData {
  reportedUserId: number;
  matchId?: number;
  reportType: ReportType;
  reason: ReportReason;
  description?: string;
}

class ReportService {
  /**
   * Create a new report (user)
   */
  async createReport(eventId: string, data: CreateReportData): Promise<{ id: number }> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/reports`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors du signalement');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get all reports for an event (organizer)
   */
  async getReports(eventId: string, status?: ReportStatus): Promise<{ stats: ReportStats; reports: Report[] }> {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }

    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/reports?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors du chargement des signalements');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get report details (organizer)
   */
  async getReportDetails(eventId: string, reportId: number): Promise<ReportDetails> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/reports/${reportId}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors du chargement du signalement');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Update report status (organizer)
   */
  async updateReport(
    eventId: string,
    reportId: number,
    data: { status?: ReportStatus; orga_notes?: string }
  ): Promise<Report> {
    const response = await authService.authenticatedFetch(
      `/api/events/${eventId}/reports/${reportId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erreur lors de la mise à jour');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get reason label in French
   */
  getReasonLabel(reason: ReportReason): string {
    const labels: Record<ReportReason, string> = {
      inappropriate: 'Contenu inapproprié',
      harassment: 'Harcèlement',
      spam: 'Spam',
      fake: 'Faux profil',
      other: 'Autre',
    };
    return labels[reason] || reason;
  }

  /**
   * Get type label in French
   */
  getTypeLabel(type: ReportType): string {
    const labels: Record<ReportType, string> = {
      photo: 'Photo',
      profile: 'Profil',
      message: 'Message',
    };
    return labels[type] || type;
  }

  /**
   * Get status label in French
   */
  getStatusLabel(status: ReportStatus): string {
    const labels: Record<ReportStatus, string> = {
      pending: 'En attente',
      reviewed: 'En cours',
      resolved: 'Résolu',
      dismissed: 'Rejeté',
    };
    return labels[status] || status;
  }

  /**
   * Get status color
   */
  getStatusColor(status: ReportStatus): string {
    const colors: Record<ReportStatus, string> = {
      pending: 'orange',
      reviewed: 'blue',
      resolved: 'green',
      dismissed: 'gray',
    };
    return colors[status] || 'gray';
  }
}

export const reportService = new ReportService();

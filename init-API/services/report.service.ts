import { ReportModel } from '../models/report.model.js';
import { EventModel } from '../models/event.model.js';
import { MatchModel } from '../models/match.model.js';
import { PhotoModel } from '../models/photo.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import type { ReportType, ReportStatus } from '../types/index.js';

const VALID_REPORT_TYPES: ReportType[] = ['photo', 'profile', 'message'];
const VALID_REASONS = ['inappropriate', 'harassment', 'spam', 'fake', 'other'] as const;

export const ReportService = {
  async createReport(eventId: number, reporterId: number, data: {
    reportedUserId: number;
    matchId?: number;
    reportType: string;
    reason: string;
    description?: string;
  }) {
    const { reportedUserId, matchId, reportType, reason, description } = data;

    if (!reportedUserId) {
      throw new ValidationError('L\'utilisateur signalé est requis');
    }

    if (!reportType || !VALID_REPORT_TYPES.includes(reportType as ReportType)) {
      throw new ValidationError('Type de signalement invalide');
    }

    if (!reason || !(VALID_REASONS as readonly string[]).includes(reason)) {
      throw new ValidationError('Raison du signalement invalide');
    }

    if (reportType === 'message' && !matchId) {
      throw new ValidationError('Le signalement de message nécessite un match_id');
    }

    if (reportedUserId === reporterId) {
      throw new ValidationError('Vous ne pouvez pas vous signaler vous-même');
    }

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const hasRecent = await ReportModel.hasRecentReport(eventId, reporterId, reportedUserId, reportType as ReportType);
    if (hasRecent) {
      throw new ConflictError('Vous avez déjà signalé cet utilisateur pour cette raison récemment');
    }

    if (matchId) {
      const match = await MatchModel.findById(matchId);
      if (!match) {
        throw new NotFoundError('Match non trouvé');
      }
      const isInMatch = (match.user1_id === reporterId && match.user2_id === reportedUserId) ||
                        (match.user2_id === reporterId && match.user1_id === reportedUserId);
      if (!isInMatch) {
        throw new ForbiddenError('Ce match ne vous concerne pas');
      }
    }

    const report = await ReportModel.create({
      eventId,
      reporterId,
      reportedUserId,
      matchId,
      reportType: reportType as ReportType,
      reason,
      description
    });

    return {
      id: report.id,
      report_type: report.report_type,
      reason: report.reason,
      status: report.status
    };
  },

  async getReports(orgaId: number, eventId: number, status: ReportStatus | null, limit: number, offset: number) {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const reports = await ReportModel.getByEventId(eventId, status, limit, offset) as Array<Record<string, unknown>>;
    const stats = await ReportModel.getStatsByEventId(eventId);

    return {
      stats: {
        total: parseInt(String(stats.total)),
        pending: parseInt(String(stats.pending)),
        reviewed: parseInt(String(stats.reviewed)),
        resolved: parseInt(String(stats.resolved)),
        dismissed: parseInt(String(stats.dismissed)),
        by_type: {
          photo: parseInt(String(stats.photo_reports)),
          profile: parseInt(String(stats.profile_reports)),
          message: parseInt(String(stats.message_reports))
        }
      },
      reports: reports.map((r: Record<string, unknown>) => ({
        id: r.id,
        report_type: r.report_type,
        reason: r.reason,
        description: r.description,
        status: r.status,
        has_match: !!r.match_id,
        reporter: {
          id: r.reporter_id,
          firstname: r.reporter_firstname,
          lastname: r.reporter_lastname
        },
        reported_user: {
          id: r.reported_user_id,
          firstname: r.reported_firstname,
          lastname: r.reported_lastname
        },
        created_at: r.created_at,
        reviewed_at: r.reviewed_at,
        resolved_at: r.resolved_at
      }))
    };
  },

  async getReportDetails(orgaId: number, eventId: number, reportId: number) {
    const report = await ReportModel.getById(reportId);
    if (!report) {
      throw new NotFoundError('Signalement non trouvé');
    }

    if (report.event_id !== eventId) {
      throw new NotFoundError('Signalement non trouvé');
    }

    if (report.orga_id !== orgaId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    let messages = null;
    if (report.report_type === 'message' && report.match_id) {
      messages = await ReportModel.getMatchMessages(report.match_id);
    }

    let photos = null;
    if (report.report_type === 'photo') {
      photos = await PhotoModel.findForSwiper(report.reported_user_id, eventId);
    }

    let profileInfo = null;
    if (report.report_type === 'profile') {
      const profile = await RegistrationModel.findUserProfileByEvent(report.reported_user_id, eventId);
      if (profile) {
        profileInfo = {
          firstname: profile.firstname,
          lastname: profile.lastname,
          birthday: profile.birthday,
          custom_fields: profile.profil_info
        };
      }
    }

    const reportCount = await ReportModel.getReportsCountForUser(eventId, report.reported_user_id);

    return {
      id: report.id,
      event: {
        id: report.event_id,
        name: report.event_name
      },
      report_type: report.report_type,
      reason: report.reason,
      description: report.description,
      status: report.status,
      orga_notes: report.orga_notes,
      reporter: {
        id: report.reporter_id,
        firstname: report.reporter_firstname,
        lastname: report.reporter_lastname
      },
      reported_user: {
        id: report.reported_user_id,
        firstname: report.reported_firstname,
        lastname: report.reported_lastname,
        total_reports: reportCount
      },
      match_id: report.match_id,
      messages: messages ? (messages as Array<Record<string, unknown>>).map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_name: `${m.firstname} ${m.lastname}`,
        content: m.content,
        sent_at: m.sent_at
      })) : null,
      photos: photos ? photos.map(p => ({
        id: p.id,
        file_path: p.file_path,
        is_primary: p.is_primary
      })) : null,
      profile_info: profileInfo,
      created_at: report.created_at,
      reviewed_at: report.reviewed_at,
      resolved_at: report.resolved_at
    };
  },

  async updateReport(orgaId: number, eventId: number, reportId: number, data: { status?: string; orga_notes?: string }) {
    const { status, orga_notes } = data;

    const report = await ReportModel.getById(reportId);
    if (!report) {
      throw new NotFoundError('Signalement non trouvé');
    }

    if (report.event_id !== eventId) {
      throw new NotFoundError('Signalement non trouvé');
    }

    if (report.orga_id !== orgaId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    if (status && !['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      throw new ValidationError('Statut invalide');
    }

    const updated = await ReportModel.updateStatus(reportId, (status || report.status) as ReportStatus, orga_notes);

    return {
      id: updated!.id,
      status: updated!.status,
      orga_notes: updated!.orga_notes,
      reviewed_at: updated!.reviewed_at,
      resolved_at: updated!.resolved_at
    };
  }
};

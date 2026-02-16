import { ReportModel } from '../models/report.model.js';
import { EventModel } from '../models/event.model.js';
import { MatchModel } from '../models/match.model.js';
import PhotoModel from '../models/photo.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';

const VALID_REPORT_TYPES = ['photo', 'profile', 'message'];
const VALID_REASONS = ['inappropriate', 'harassment', 'spam', 'fake', 'other'];

export const ReportController = {
  /**
   * POST /api/events/:id/reports
   * Create a new report (user)
   */
  async createReport(req, res) {
    const eventId = parseInt(req.params.id);
    const reporterId = req.user.id;
    const { reportedUserId, matchId, reportType, reason, description } = req.body;

    // Validate required fields
    if (!reportedUserId) {
      throw new ValidationError('L\'utilisateur signalé est requis');
    }

    if (!reportType || !VALID_REPORT_TYPES.includes(reportType)) {
      throw new ValidationError('Type de signalement invalide');
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      throw new ValidationError('Raison du signalement invalide');
    }

    // Message reports require a match_id
    if (reportType === 'message' && !matchId) {
      throw new ValidationError('Le signalement de message nécessite un match_id');
    }

    // Cannot report yourself
    if (reportedUserId === reporterId) {
      throw new ValidationError('Vous ne pouvez pas vous signaler vous-même');
    }

    // Check event exists
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    // Check for duplicate recent report
    const hasRecent = await ReportModel.hasRecentReport(eventId, reporterId, reportedUserId, reportType);
    if (hasRecent) {
      throw new ConflictError('Vous avez déjà signalé cet utilisateur pour cette raison récemment');
    }

    // If matchId provided, verify it exists and involves both users
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
      reportType,
      reason,
      description
    });

    return created(res, {
      id: report.id,
      report_type: report.report_type,
      reason: report.reason,
      status: report.status
    }, 'Signalement envoyé');
  },

  /**
   * GET /api/events/:id/reports
   * Get all reports for an event (organizer only)
   */
  async getReports(req, res) {
    const eventId = parseInt(req.params.id);
    const orgaId = req.user.id;
    const { status } = req.query;

    // Check event exists and belongs to orga
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const reports = await ReportModel.getByEventId(eventId, status || null);
    const stats = await ReportModel.getStatsByEventId(eventId);

    return success(res, {
      stats: {
        total: parseInt(stats.total),
        pending: parseInt(stats.pending),
        reviewed: parseInt(stats.reviewed),
        resolved: parseInt(stats.resolved),
        dismissed: parseInt(stats.dismissed),
        by_type: {
          photo: parseInt(stats.photo_reports),
          profile: parseInt(stats.profile_reports),
          message: parseInt(stats.message_reports)
        }
      },
      reports: reports.map(r => ({
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
    });
  },

  /**
   * GET /api/events/:id/reports/:reportId
   * Get a specific report with details (organizer only)
   */
  async getReportDetails(req, res) {
    const eventId = parseInt(req.params.id);
    const reportId = parseInt(req.params.reportId);
    const orgaId = req.user.id;

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

    // Get messages if it's a message report
    let messages = null;
    if (report.report_type === 'message' && report.match_id) {
      messages = await ReportModel.getMatchMessages(report.match_id);
    }

    // Get photos if it's a photo report
    let photos = null;
    if (report.report_type === 'photo') {
      photos = await PhotoModel.findForSwiper(report.reported_user_id, eventId);
    }

    // Get profile info if it's a profile report
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

    // Get report count for the reported user (repeat offender detection)
    const reportCount = await ReportModel.getReportsCountForUser(eventId, report.reported_user_id);

    return success(res, {
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
      messages: messages ? messages.map(m => ({
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
    });
  },

  /**
   * PUT /api/events/:id/reports/:reportId
   * Update report status (organizer only)
   */
  async updateReport(req, res) {
    const eventId = parseInt(req.params.id);
    const reportId = parseInt(req.params.reportId);
    const orgaId = req.user.id;
    const { status, orga_notes } = req.body;

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

    const updated = await ReportModel.updateStatus(reportId, status || report.status, orga_notes);

    return success(res, {
      id: updated.id,
      status: updated.status,
      orga_notes: updated.orga_notes,
      reviewed_at: updated.reviewed_at,
      resolved_at: updated.resolved_at
    }, 'Signalement mis à jour');
  }
};

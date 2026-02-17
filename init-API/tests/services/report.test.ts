import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret';

  return {
    ReportModel: {
      create: vi.fn(),
      getByEventId: vi.fn(),
      getStatsByEventId: vi.fn(),
      getById: vi.fn(),
      getMatchMessages: vi.fn(),
      getReportsCountForUser: vi.fn(),
      updateStatus: vi.fn(),
      hasRecentReport: vi.fn(),
    },
    EventModel: {
      findById: vi.fn(),
    },
    MatchModel: {
      findById: vi.fn(),
    },
    PhotoModel: {
      findForSwiper: vi.fn(),
    },
    RegistrationModel: {
      findUserProfileByEvent: vi.fn(),
    },
  };
});

vi.mock('../../models/report.model.js', () => ({ ReportModel: mocks.ReportModel }));
vi.mock('../../models/event.model.js', () => ({ EventModel: mocks.EventModel }));
vi.mock('../../models/match.model.js', () => ({ MatchModel: mocks.MatchModel }));
vi.mock('../../models/photo.model.js', () => ({ PhotoModel: mocks.PhotoModel }));
vi.mock('../../models/registration.model.js', () => ({ RegistrationModel: mocks.RegistrationModel }));
vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { ReportService } from '../../services/report.service';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../utils/errors';

async function expectError(
  fn: () => Promise<unknown>,
  ErrorClass: new (...args: any[]) => Error,
  message: string
) {
  try {
    await fn();
    expect.unreachable('Expected an error to be thrown');
  } catch (err: any) {
    expect(err.constructor.name).toBe(ErrorClass.name);
    expect(err.message).toBe(message);
  }
}

describe('ReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReport', () => {
    const validData = {
      reportedUserId: 2,
      matchId: undefined as number | undefined,
      reportType: 'photo',
      reason: 'inappropriate',
      description: 'Bad photo',
    };

    it('should throw ValidationError when reportedUserId is missing', async () => {
      await expectError(
        () => ReportService.createReport(1, 1, { ...validData, reportedUserId: 0 as any }),
        ValidationError,
        "L'utilisateur signalé est requis"
      );
    });

    it('should throw ValidationError for invalid reportType', async () => {
      await expectError(
        () => ReportService.createReport(1, 1, { ...validData, reportType: 'invalid' }),
        ValidationError,
        'Type de signalement invalide'
      );
    });

    it('should throw ValidationError for invalid reason', async () => {
      await expectError(
        () => ReportService.createReport(1, 1, { ...validData, reason: 'bad_reason' }),
        ValidationError,
        'Raison du signalement invalide'
      );
    });

    it('should throw ValidationError when message report lacks matchId', async () => {
      await expectError(
        () => ReportService.createReport(1, 1, { ...validData, reportType: 'message' }),
        ValidationError,
        'Le signalement de message nécessite un match_id'
      );
    });

    it('should throw ValidationError when reporting yourself', async () => {
      await expectError(
        () => ReportService.createReport(1, 5, { ...validData, reportedUserId: 5 }),
        ValidationError,
        'Vous ne pouvez pas vous signaler vous-même'
      );
    });

    it('should throw NotFoundError when event does not exist', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce(undefined);

      await expectError(
        () => ReportService.createReport(1, 1, validData),
        NotFoundError,
        'Événement non trouvé'
      );
    });

    it('should throw ConflictError when a recent duplicate report exists', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 1 });
      mocks.ReportModel.hasRecentReport.mockResolvedValueOnce(true);

      await expectError(
        () => ReportService.createReport(1, 1, validData),
        ConflictError,
        'Vous avez déjà signalé cet utilisateur pour cette raison récemment'
      );
    });

    it('should throw NotFoundError when matchId provided but match not found', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 1 });
      mocks.ReportModel.hasRecentReport.mockResolvedValueOnce(false);
      mocks.MatchModel.findById.mockResolvedValueOnce(undefined);

      await expectError(
        () => ReportService.createReport(1, 1, { ...validData, matchId: 99 }),
        NotFoundError,
        'Match non trouvé'
      );
    });

    it('should throw ForbiddenError when match does not involve reporter', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 1 });
      mocks.ReportModel.hasRecentReport.mockResolvedValueOnce(false);
      mocks.MatchModel.findById.mockResolvedValueOnce({ id: 10, user1_id: 3, user2_id: 4 });

      await expectError(
        () => ReportService.createReport(1, 1, { ...validData, matchId: 10 }),
        ForbiddenError,
        'Ce match ne vous concerne pas'
      );
    });

    it('should create the report and return shaped result', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5 });
      mocks.ReportModel.hasRecentReport.mockResolvedValueOnce(false);

      const newReport = {
        id: 42,
        report_type: 'photo',
        reason: 'inappropriate',
        status: 'pending',
      };
      mocks.ReportModel.create.mockResolvedValueOnce(newReport);

      const result = await ReportService.createReport(5, 1, validData);

      expect(mocks.ReportModel.create).toHaveBeenCalledWith({
        eventId: 5,
        reporterId: 1,
        reportedUserId: 2,
        matchId: undefined,
        reportType: 'photo',
        reason: 'inappropriate',
        description: 'Bad photo',
      });
      expect(result).toEqual({
        id: 42,
        report_type: 'photo',
        reason: 'inappropriate',
        status: 'pending',
      });
    });

    it('should validate match ownership when matchId is provided', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5 });
      mocks.ReportModel.hasRecentReport.mockResolvedValueOnce(false);
      mocks.MatchModel.findById.mockResolvedValueOnce({ id: 10, user1_id: 1, user2_id: 2 });
      mocks.ReportModel.create.mockResolvedValueOnce({
        id: 50,
        report_type: 'photo',
        reason: 'inappropriate',
        status: 'pending',
      });

      const result = await ReportService.createReport(5, 1, { ...validData, matchId: 10 });

      expect(mocks.ReportModel.create).toHaveBeenCalled();
      expect(result.id).toBe(50);
    });
  });

  describe('getReports', () => {
    it('should throw NotFoundError when event does not exist', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce(undefined);

      await expectError(
        () => ReportService.getReports(1, 1, null, 50, 0),
        NotFoundError,
        'Événement non trouvé'
      );
    });

    it('should throw ForbiddenError when orga does not own the event', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 1, orga_id: 99 });

      await expectError(
        () => ReportService.getReports(1, 1, null, 50, 0),
        ForbiddenError,
        'Accès non autorisé'
      );
    });

    it('should return reports with stats', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });

      const rawReports = [
        {
          id: 10,
          report_type: 'photo',
          reason: 'fake',
          description: 'Fake pic',
          status: 'pending',
          match_id: null,
          reporter_id: 2,
          reporter_firstname: 'Alice',
          reporter_lastname: 'A',
          reported_user_id: 3,
          reported_firstname: 'Bob',
          reported_lastname: 'B',
          created_at: '2025-01-01',
          reviewed_at: null,
          resolved_at: null,
        },
      ];
      mocks.ReportModel.getByEventId.mockResolvedValueOnce(rawReports);

      const stats = {
        total: '1', pending: '1', reviewed: '0', resolved: '0', dismissed: '0',
        photo_reports: '1', profile_reports: '0', message_reports: '0',
      };
      mocks.ReportModel.getStatsByEventId.mockResolvedValueOnce(stats);

      const result = await ReportService.getReports(1, 5, 'pending', 50, 0);

      expect(mocks.ReportModel.getByEventId).toHaveBeenCalledWith(5, 'pending', 50, 0);
      expect(mocks.ReportModel.getStatsByEventId).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        stats: {
          total: 1, pending: 1, reviewed: 0, resolved: 0, dismissed: 0,
          by_type: { photo: 1, profile: 0, message: 0 },
        },
        reports: [
          {
            id: 10, report_type: 'photo', reason: 'fake', description: 'Fake pic',
            status: 'pending', has_match: false,
            reporter: { id: 2, firstname: 'Alice', lastname: 'A' },
            reported_user: { id: 3, firstname: 'Bob', lastname: 'B' },
            created_at: '2025-01-01', reviewed_at: null, resolved_at: null,
          },
        ],
      });
    });

    it('should pass null status when none provided', async () => {
      mocks.EventModel.findById.mockResolvedValueOnce({ id: 5, orga_id: 1 });
      mocks.ReportModel.getByEventId.mockResolvedValueOnce([]);
      mocks.ReportModel.getStatsByEventId.mockResolvedValueOnce({
        total: '0', pending: '0', reviewed: '0', resolved: '0', dismissed: '0',
        photo_reports: '0', profile_reports: '0', message_reports: '0',
      });

      await ReportService.getReports(1, 5, null, 50, 0);

      expect(mocks.ReportModel.getByEventId).toHaveBeenCalledWith(5, null, 50, 0);
    });
  });

  describe('getReportDetails', () => {
    const baseReport = {
      id: 1, event_id: 5, orga_id: 1,
      report_type: 'photo', match_id: null,
      reason: 'fake', description: null,
      status: 'pending', orga_notes: null,
      reporter_id: 2, reporter_firstname: 'Alice', reporter_lastname: 'A',
      reported_user_id: 3, reported_firstname: 'Bob', reported_lastname: 'B',
      event_name: 'Party',
      created_at: '2025-01-01', reviewed_at: null, resolved_at: null,
    };

    it('should throw NotFoundError when report does not exist', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce(undefined);

      await expectError(
        () => ReportService.getReportDetails(1, 5, 99),
        NotFoundError,
        'Signalement non trouvé'
      );
    });

    it('should throw NotFoundError when report event_id does not match', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce({ ...baseReport, event_id: 99 });

      await expectError(
        () => ReportService.getReportDetails(1, 5, 1),
        NotFoundError,
        'Signalement non trouvé'
      );
    });

    it('should throw ForbiddenError when orga does not own the event', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce({ ...baseReport, orga_id: 99 });

      await expectError(
        () => ReportService.getReportDetails(1, 5, 1),
        ForbiddenError,
        'Accès non autorisé'
      );
    });

    it('should fetch messages for a message report', async () => {
      const report = { ...baseReport, report_type: 'message', match_id: 10, reason: 'harassment' };
      mocks.ReportModel.getById.mockResolvedValueOnce(report);

      const messages = [
        { id: 1, sender_id: 2, firstname: 'Alice', lastname: 'A', content: 'Hello', sent_at: '2025-01-01' },
      ];
      mocks.ReportModel.getMatchMessages.mockResolvedValueOnce(messages);
      mocks.ReportModel.getReportsCountForUser.mockResolvedValueOnce(3);

      const result = await ReportService.getReportDetails(1, 5, 1);

      expect(mocks.ReportModel.getMatchMessages).toHaveBeenCalledWith(10);
      expect(mocks.PhotoModel.findForSwiper).not.toHaveBeenCalled();
      expect(mocks.RegistrationModel.findUserProfileByEvent).not.toHaveBeenCalled();
      expect(result.messages).toEqual([
        { id: 1, sender_id: 2, sender_name: 'Alice A', content: 'Hello', sent_at: '2025-01-01' },
      ]);
      expect(result.photos).toBeNull();
      expect(result.profile_info).toBeNull();
    });

    it('should fetch photos for a photo report', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce(baseReport);

      const photos = [
        { id: 10, file_path: '/uploads/photo.jpg', is_primary: true },
      ];
      mocks.PhotoModel.findForSwiper.mockResolvedValueOnce(photos);
      mocks.ReportModel.getReportsCountForUser.mockResolvedValueOnce(1);

      const result = await ReportService.getReportDetails(1, 5, 1);

      expect(mocks.PhotoModel.findForSwiper).toHaveBeenCalledWith(3, 5);
      expect(mocks.ReportModel.getMatchMessages).not.toHaveBeenCalled();
      expect(result.photos).toEqual([
        { id: 10, file_path: '/uploads/photo.jpg', is_primary: true },
      ]);
      expect(result.messages).toBeNull();
      expect(result.profile_info).toBeNull();
    });

    it('should fetch profile info for a profile report', async () => {
      const report = { ...baseReport, report_type: 'profile' };
      mocks.ReportModel.getById.mockResolvedValueOnce(report);

      const profile = {
        firstname: 'Bob', lastname: 'B', birthday: '1995-05-05',
        profil_info: { bio: 'Hello' },
      };
      mocks.RegistrationModel.findUserProfileByEvent.mockResolvedValueOnce(profile);
      mocks.ReportModel.getReportsCountForUser.mockResolvedValueOnce(2);

      const result = await ReportService.getReportDetails(1, 5, 1);

      expect(mocks.RegistrationModel.findUserProfileByEvent).toHaveBeenCalledWith(3, 5);
      expect(result.profile_info).toEqual({
        firstname: 'Bob', lastname: 'B', birthday: '1995-05-05',
        custom_fields: { bio: 'Hello' },
      });
    });

    it('should set profile_info to null when profile not found', async () => {
      const report = { ...baseReport, report_type: 'profile' };
      mocks.ReportModel.getById.mockResolvedValueOnce(report);
      mocks.RegistrationModel.findUserProfileByEvent.mockResolvedValueOnce(undefined);
      mocks.ReportModel.getReportsCountForUser.mockResolvedValueOnce(0);

      const result = await ReportService.getReportDetails(1, 5, 1);

      expect(result.profile_info).toBeNull();
    });

    it('should include reported_user.total_reports', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce(baseReport);
      mocks.PhotoModel.findForSwiper.mockResolvedValueOnce([]);
      mocks.ReportModel.getReportsCountForUser.mockResolvedValueOnce(7);

      const result = await ReportService.getReportDetails(1, 5, 1);

      expect(mocks.ReportModel.getReportsCountForUser).toHaveBeenCalledWith(5, 3);
      expect(result.reported_user.total_reports).toBe(7);
    });
  });

  describe('updateReport', () => {
    it('should throw NotFoundError when report does not exist', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce(undefined);

      await expectError(
        () => ReportService.updateReport(1, 1, 1, { status: 'reviewed' }),
        NotFoundError,
        'Signalement non trouvé'
      );
    });

    it('should throw NotFoundError when report event_id does not match', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce({ id: 1, event_id: 99, orga_id: 1 });

      await expectError(
        () => ReportService.updateReport(1, 5, 1, { status: 'reviewed' }),
        NotFoundError,
        'Signalement non trouvé'
      );
    });

    it('should throw ForbiddenError when orga does not own the event', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce({ id: 1, event_id: 5, orga_id: 99 });

      await expectError(
        () => ReportService.updateReport(1, 5, 1, { status: 'reviewed' }),
        ForbiddenError,
        'Accès non autorisé'
      );
    });

    it('should throw ValidationError for invalid status value', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce({ id: 1, event_id: 5, orga_id: 1 });

      await expectError(
        () => ReportService.updateReport(1, 5, 1, { status: 'invalid_status' }),
        ValidationError,
        'Statut invalide'
      );
    });

    it('should update the report and return result', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce({
        id: 1, event_id: 5, orga_id: 1, status: 'pending',
      });

      const updated = {
        id: 1, status: 'resolved', orga_notes: 'Handled',
        reviewed_at: null, resolved_at: '2025-01-02',
      };
      mocks.ReportModel.updateStatus.mockResolvedValueOnce(updated);

      const result = await ReportService.updateReport(1, 5, 1, { status: 'resolved', orga_notes: 'Handled' });

      expect(mocks.ReportModel.updateStatus).toHaveBeenCalledWith(1, 'resolved', 'Handled');
      expect(result).toEqual({
        id: 1, status: 'resolved', orga_notes: 'Handled',
        reviewed_at: null, resolved_at: '2025-01-02',
      });
    });

    it('should use existing report status when no status is provided', async () => {
      mocks.ReportModel.getById.mockResolvedValueOnce({
        id: 1, event_id: 5, orga_id: 1, status: 'reviewed',
      });

      const updated = { id: 1, status: 'reviewed', orga_notes: 'A note', reviewed_at: '2025-01-01', resolved_at: null };
      mocks.ReportModel.updateStatus.mockResolvedValueOnce(updated);

      await ReportService.updateReport(1, 5, 1, { orga_notes: 'A note' });

      expect(mocks.ReportModel.updateStatus).toHaveBeenCalledWith(1, 'reviewed', 'A note');
    });
  });
});

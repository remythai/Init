import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockConnect, mockOn } = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return {
    mockQuery: vi.fn(),
    mockConnect: vi.fn(),
    mockOn: vi.fn(),
  };
});

vi.mock('pg', () => ({
  Pool: class {
    query = mockQuery;
    connect = mockConnect;
    on = mockOn;
  },
}));

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

import { ReportModel } from '../../models/report.model';

describe('ReportModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should INSERT with all fields and matchId defaults to null', async () => {
      const reportData = {
        eventId: 1,
        reporterId: 10,
        reportedUserId: 20,
        reportType: 'message',
        reason: 'Inappropriate content',
        description: 'Sent offensive messages',
      };
      const reportRow = { id: 1, event_id: 1, reporter_id: 10, reported_user_id: 20 };
      mockQuery.mockResolvedValueOnce({ rows: [reportRow] });

      const result = await ReportModel.create(reportData);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('INSERT INTO reports'));
      expect(sql).toEqual(expect.stringContaining('event_id, reporter_id, reported_user_id, match_id, report_type, reason, description'));
      expect(sql).toEqual(expect.stringContaining('RETURNING *'));
      expect(params).toEqual([1, 10, 20, null, 'message', 'Inappropriate content', 'Sent offensive messages']);
      expect(result).toEqual(reportRow);
    });

    it('should pass matchId when provided', async () => {
      const reportData = {
        eventId: 1,
        reporterId: 10,
        reportedUserId: 20,
        matchId: 55,
        reportType: 'photo',
        reason: 'Fake photo',
        description: null,
      };
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });

      await ReportModel.create(reportData);

      const [, params] = mockQuery.mock.calls[0];
      expect(params[3]).toBe(55);
    });
  });

  describe('getByEventId', () => {
    it('should use JOIN query without status filter', async () => {
      const rows = [
        { id: 1, reporter_firstname: 'Alice', reported_firstname: 'Bob' },
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await ReportModel.getByEventId(5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('JOIN users reporter ON r.reporter_id = reporter.id'));
      expect(sql).toEqual(expect.stringContaining('JOIN users reported ON r.reported_user_id = reported.id'));
      expect(sql).toEqual(expect.stringContaining('WHERE r.event_id = $1'));
      expect(sql).not.toEqual(expect.stringContaining('r.status = $2'));
      expect(sql).toEqual(expect.stringContaining('ORDER BY r.created_at DESC'));
      expect(params).toEqual([5, 50, 0]);
      expect(result).toEqual(rows);
    });

    it('should add status filter when status is provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await ReportModel.getByEventId(5, 'pending');

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('r.status = $2'));
      expect(params).toEqual([5, 'pending', 50, 0]);
    });
  });

  describe('getById', () => {
    it('should use triple JOIN query', async () => {
      const row = {
        id: 1,
        reporter_firstname: 'Alice',
        reported_firstname: 'Bob',
        event_name: 'Summer Party',
        orga_id: 3,
      };
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await ReportModel.getById(1);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('JOIN users reporter ON r.reporter_id = reporter.id'));
      expect(sql).toEqual(expect.stringContaining('JOIN users reported ON r.reported_user_id = reported.id'));
      expect(sql).toEqual(expect.stringContaining('JOIN events e ON r.event_id = e.id'));
      expect(sql).toEqual(expect.stringContaining('WHERE r.id = $1'));
      expect(params).toEqual([1]);
      expect(result).toEqual(row);
    });
  });

  describe('updateStatus', () => {
    it('should set reviewed_at for reviewed status', async () => {
      const updatedRow = { id: 1, status: 'reviewed' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await ReportModel.updateStatus(1, 'reviewed');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('status = $2'));
      expect(sql).toEqual(expect.stringContaining('reviewed_at = CURRENT_TIMESTAMP'));
      expect(sql).not.toEqual(expect.stringContaining('resolved_at'));
      expect(sql).toEqual(expect.stringContaining('WHERE id = $1'));
      expect(sql).toEqual(expect.stringContaining('RETURNING *'));
      expect(params).toEqual([1, 'reviewed']);
      expect(result).toEqual(updatedRow);
    });

    it('should set resolved_at for resolved status', async () => {
      const updatedRow = { id: 2, status: 'resolved' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await ReportModel.updateStatus(2, 'resolved');

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('resolved_at = CURRENT_TIMESTAMP'));
      expect(sql).not.toEqual(expect.stringContaining('reviewed_at'));
      expect(params).toEqual([2, 'resolved']);
      expect(result).toEqual(updatedRow);
    });

    it('should set resolved_at for dismissed status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 3, status: 'dismissed' }] });

      await ReportModel.updateStatus(3, 'dismissed');

      const [sql] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('resolved_at = CURRENT_TIMESTAMP'));
    });

    it('should include orga_notes when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'reviewed' }] });

      await ReportModel.updateStatus(1, 'reviewed', 'Looks legit');

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('orga_notes = $3'));
      expect(params).toEqual([1, 'reviewed', 'Looks legit']);
    });
  });

  describe('hasRecentReport', () => {
    it('should return true when recent report exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await ReportModel.hasRecentReport(1, 10, 20, 'message');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT 1 FROM reports'));
      expect(sql).toEqual(expect.stringContaining('24 hours'));
      expect(params).toEqual([1, 10, 20, 'message']);
      expect(result).toBe(true);
    });

    it('should return false when no recent report', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await ReportModel.hasRecentReport(1, 10, 20, 'photo');

      expect(result).toBe(false);
    });
  });

  describe('getReportsCountForUser', () => {
    it('should return parsed int', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '4' }] });

      const result = await ReportModel.getReportsCountForUser(1, 20);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT COUNT(*)'));
      expect(sql).toEqual(expect.stringContaining('event_id = $1'));
      expect(sql).toEqual(expect.stringContaining('reported_user_id = $2'));
      expect(params).toEqual([1, 20]);
      expect(result).toBe(4);
      expect(typeof result).toBe('number');
    });
  });

  describe('getStatsByEventId', () => {
    it('should query with FILTER clauses', async () => {
      const statsRow = {
        total: '10',
        pending: '3',
        reviewed: '2',
        resolved: '4',
        dismissed: '1',
        photo_reports: '2',
        profile_reports: '5',
        message_reports: '3',
      };
      mockQuery.mockResolvedValueOnce({ rows: [statsRow] });

      const result = await ReportModel.getStatsByEventId(5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining("FILTER (WHERE status = 'pending')"));
      expect(sql).toEqual(expect.stringContaining("FILTER (WHERE status = 'reviewed')"));
      expect(sql).toEqual(expect.stringContaining("FILTER (WHERE status = 'resolved')"));
      expect(sql).toEqual(expect.stringContaining("FILTER (WHERE status = 'dismissed')"));
      expect(sql).toEqual(expect.stringContaining("FILTER (WHERE report_type = 'photo')"));
      expect(sql).toEqual(expect.stringContaining("FILTER (WHERE report_type = 'profile')"));
      expect(sql).toEqual(expect.stringContaining("FILTER (WHERE report_type = 'message')"));
      expect(sql).toEqual(expect.stringContaining('WHERE event_id = $1'));
      expect(params).toEqual([5]);
      expect(result).toEqual(statsRow);
    });
  });
});

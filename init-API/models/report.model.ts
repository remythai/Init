import pool from '../config/database.js';
import type { ReportCreateInput, ReportRow, ReportStatus, ReportType, ReportStats } from '../types/index.js';

export const ReportModel = {
  async create({ eventId, reporterId, reportedUserId, matchId, reportType, reason, description }: ReportCreateInput): Promise<ReportRow> {
    const result = await pool.query(
      `INSERT INTO reports (event_id, reporter_id, reported_user_id, match_id, report_type, reason, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventId, reporterId, reportedUserId, matchId ?? null, reportType, reason, description ?? null]
    );
    return result.rows[0];
  },

  async getByEventId(eventId: number, status: ReportStatus | null = null, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    let query = `
      SELECT r.*,
        reporter.firstname as reporter_firstname,
        reporter.lastname as reporter_lastname,
        reported.firstname as reported_firstname,
        reported.lastname as reported_lastname
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      WHERE r.event_id = $1
    `;
    const params: unknown[] = [eventId];
    let paramCount = 2;

    if (status) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY r.created_at DESC`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  },

  async getById(reportId: number): Promise<(ReportRow & { reporter_firstname: string; reporter_lastname: string; reported_firstname: string; reported_lastname: string; event_name: string; orga_id: number }) | undefined> {
    const result = await pool.query(
      `SELECT r.*,
        reporter.firstname as reporter_firstname,
        reporter.lastname as reporter_lastname,
        reporter.tel as reporter_tel,
        reported.firstname as reported_firstname,
        reported.lastname as reported_lastname,
        reported.tel as reported_tel,
        e.name as event_name,
        e.orga_id
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_user_id = reported.id
      JOIN events e ON r.event_id = e.id
      WHERE r.id = $1`,
      [reportId]
    );
    return result.rows[0];
  },

  async updateStatus(reportId: number, status: ReportStatus, orgaNotes: string | null = null): Promise<ReportRow | undefined> {
    const updates = ['status = $2'];
    const params: unknown[] = [reportId, status];
    let paramIndex = 3;

    if (status === 'reviewed') {
      updates.push('reviewed_at = CURRENT_TIMESTAMP');
    } else if (status === 'resolved' || status === 'dismissed') {
      updates.push('resolved_at = CURRENT_TIMESTAMP');
    }

    if (orgaNotes !== null) {
      updates.push(`orga_notes = $${paramIndex}`);
      params.push(orgaNotes);
    }

    const result = await pool.query(
      `UPDATE reports SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return result.rows[0];
  },

  async getMatchMessages(matchId: number, limit: number = 100): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT m.*, u.firstname, u.lastname
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.match_id = $1
       ORDER BY m.sent_at ASC
       LIMIT $2`,
      [matchId, limit]
    );
    return result.rows;
  },

  async getStatsByEventId(eventId: number): Promise<ReportStats> {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed,
        COUNT(*) FILTER (WHERE report_type = 'photo') as photo_reports,
        COUNT(*) FILTER (WHERE report_type = 'profile') as profile_reports,
        COUNT(*) FILTER (WHERE report_type = 'message') as message_reports
      FROM reports
      WHERE event_id = $1`,
      [eventId]
    );
    return result.rows[0];
  },

  async hasRecentReport(eventId: number, reporterId: number, reportedUserId: number, reportType: ReportType): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM reports
       WHERE event_id = $1
         AND reporter_id = $2
         AND reported_user_id = $3
         AND report_type = $4
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [eventId, reporterId, reportedUserId, reportType]
    );
    return result.rows.length > 0;
  },

  async getReportsCountForUser(eventId: number, userId: number): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM reports
       WHERE event_id = $1 AND reported_user_id = $2`,
      [eventId, userId]
    );
    return parseInt(result.rows[0].count);
  }
};

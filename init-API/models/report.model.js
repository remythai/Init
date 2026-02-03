import pool from '../config/database.js';

export const ReportModel = {
  /**
   * Create a new report
   */
  async create({ eventId, reporterId, reportedUserId, matchId, reportType, reason, description }) {
    const result = await pool.query(
      `INSERT INTO reports (event_id, reporter_id, reported_user_id, match_id, report_type, reason, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventId, reporterId, reportedUserId, matchId || null, reportType, reason, description || null]
    );
    return result.rows[0];
  },

  /**
   * Get all reports for an event (for organizer)
   */
  async getByEventId(eventId, status = null) {
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
    const params = [eventId];

    if (status) {
      query += ` AND r.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Get a report by ID with full details
   */
  async getById(reportId) {
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

  /**
   * Update report status
   */
  async updateStatus(reportId, status, orgaNotes = null) {
    const updates = ['status = $2'];
    const params = [reportId, status];
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

  /**
   * Get messages for a match (for organizer viewing reported conversation)
   */
  async getMatchMessages(matchId, limit = 100) {
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

  /**
   * Get report statistics for an event
   */
  async getStatsByEventId(eventId) {
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

  /**
   * Check if user already reported another user for same type recently
   */
  async hasRecentReport(eventId, reporterId, reportedUserId, reportType) {
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

  /**
   * Get reports count for a user on an event (to detect repeat offenders)
   */
  async getReportsCountForUser(eventId, userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM reports
       WHERE event_id = $1 AND reported_user_id = $2`,
      [eventId, userId]
    );
    return parseInt(result.rows[0].count);
  }
};

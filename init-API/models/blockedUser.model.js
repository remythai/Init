import pool from '../config/database.js';

export const BlockedUserModel = {
  /**
   * Block a user from an event
   */
  async block(eventId, userId, reason = null, client = pool) {
    const result = await client.query(
      `INSERT INTO event_blocked_users (event_id, user_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO UPDATE
       SET blocked_at = CURRENT_TIMESTAMP, reason = EXCLUDED.reason
       RETURNING *`,
      [eventId, userId, reason]
    );
    return result.rows[0];
  },

  /**
   * Check if a user is blocked from an event
   */
  async isBlocked(eventId, userId) {
    const result = await pool.query(
      `SELECT 1 FROM event_blocked_users
       WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    return result.rows.length > 0;
  },

  /**
   * Unblock a user from an event
   */
  async unblock(eventId, userId) {
    const result = await pool.query(
      `DELETE FROM event_blocked_users
       WHERE event_id = $1 AND user_id = $2
       RETURNING *`,
      [eventId, userId]
    );
    return result.rows[0];
  },

  /**
   * Get all blocked users for an event
   */
  async getByEventId(eventId) {
    const result = await pool.query(
      `SELECT b.*, u.firstname, u.lastname, u.mail, u.tel
       FROM event_blocked_users b
       JOIN users u ON b.user_id = u.id
       WHERE b.event_id = $1
       ORDER BY b.blocked_at DESC`,
      [eventId]
    );
    return result.rows;
  }
};

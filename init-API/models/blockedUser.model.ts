import pool from '../config/database.js';
import type { DbClient, BlockedUserRow } from '../types/index.js';

export const BlockedUserModel = {
  async block(eventId: number, userId: number, reason: string | null = null, client: DbClient = pool): Promise<BlockedUserRow> {
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

  async isBlocked(eventId: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM event_blocked_users
       WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    return result.rows.length > 0;
  },

  async unblock(eventId: number, userId: number): Promise<BlockedUserRow | undefined> {
    const result = await pool.query(
      `DELETE FROM event_blocked_users
       WHERE event_id = $1 AND user_id = $2
       RETURNING *`,
      [eventId, userId]
    );
    return result.rows[0];
  },

  async getByEventId(eventId: number, limit: number = 50, offset: number = 0): Promise<(BlockedUserRow & { firstname: string; lastname: string; mail: string; tel: string })[]> {
    const result = await pool.query(
      `SELECT b.*, u.firstname, u.lastname, u.mail, u.tel
       FROM event_blocked_users b
       JOIN users u ON b.user_id = u.id
       WHERE b.event_id = $1
       ORDER BY b.blocked_at DESC
       LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );
    return result.rows;
  }
};

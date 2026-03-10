import pool from '../config/database.js';

export const SessionModel = {
  async createSession(userId: number): Promise<number> {
    const result = await pool.query(
      `INSERT INTO user_sessions (user_id) VALUES ($1) RETURNING id`,
      [userId]
    );
    return result.rows[0].id;
  },

  async endSession(sessionId: number): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET disconnected_at = NOW() WHERE id = $1 AND disconnected_at IS NULL`,
      [sessionId]
    );
  },

  async updateLastActivity(sessionId: number): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1 AND disconnected_at IS NULL`,
      [sessionId]
    );
  },

  async updateLastActivityByUser(userId: number): Promise<void> {
    await pool.query(
      `UPDATE user_sessions SET last_activity_at = NOW()
       WHERE user_id = $1 AND disconnected_at IS NULL`,
      [userId]
    );
  },

  async getDailyStats(startDate: string, endDate: string): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT day, active_users, avg_duration_seconds, total_sessions
       FROM daily_stats
       WHERE day >= $1 AND day <= $2
       ORDER BY day DESC`,
      [startDate, endDate]
    );
    return result.rows;
  },

  async getLiveStats(): Promise<{ active_users: number; active_sessions: number }> {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as active_sessions
       FROM user_sessions
       WHERE disconnected_at IS NULL
       AND last_activity_at > NOW() - INTERVAL '15 minutes'`
    );
    return {
      active_users: parseInt(result.rows[0].active_users),
      active_sessions: parseInt(result.rows[0].active_sessions)
    };
  }
};

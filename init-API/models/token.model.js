import pool from '../config/database.js';

export const TokenModel = {
  async create(userId, token, expiry) {
    const result = await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expiry) VALUES ($1, $2, $3) RETURNING *',
      [userId, token, expiry]
    );
    return result.rows[0];
  },

  async findValidToken(token) {
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expiry > NOW()',
      [token]
    );
    return result.rows[0];
  },

  async delete(token) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  },

  async deleteAllForUser(userId) {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  },

  async cleanExpired() {
    await pool.query('DELETE FROM refresh_tokens WHERE expiry <= NOW()');
  }
};
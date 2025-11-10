import pool from '../config/database.js';

export const TokenModel = {
  async create(entityId, token, expiry, userType = 'user') {
    if (!['user', 'orga'].includes(userType)) {
      throw new Error('userType doit être "user" ou "orga"');
    }

    const userId = userType === 'user' ? entityId : null;
    const orgaId = userType === 'orga' ? entityId : null;

    const result = await pool.query(
      `INSERT INTO refresh_tokens (user_id, orga_id, token, expiry, user_type) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, orgaId, token, expiry, userType]
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

  async deleteAllForUser(userId, userType = 'user') {
    if (userType === 'user') {
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    } else {
      await pool.query('DELETE FROM refresh_tokens WHERE orga_id = $1', [userId]);
    }
  },

  async cleanExpired() {
    await pool.query('DELETE FROM refresh_tokens WHERE expiry <= NOW()');
  }
};
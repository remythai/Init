import crypto from 'crypto';
import pool from '../config/database.js';
import type { RefreshTokenRow, UserType } from '../types/index.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const TokenModel = {
  async create(entityId: number, token: string, expiry: Date, userType: UserType = 'user'): Promise<RefreshTokenRow> {
    if (!['user', 'orga'].includes(userType)) {
      throw new Error('userType doit être "user" ou "orga"');
    }

    const userId = userType === 'user' ? entityId : null;
    const orgaId = userType === 'orga' ? entityId : null;
    const tokenHash = hashToken(token);

    const result = await pool.query(
      `INSERT INTO refresh_tokens (user_id, orga_id, token, expiry, user_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, orgaId, tokenHash, expiry, userType]
    );
    return result.rows[0];
  },

  async findValidToken(token: string): Promise<RefreshTokenRow | undefined> {
    const tokenHash = hashToken(token);
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expiry > NOW()',
      [tokenHash]
    );
    return result.rows[0];
  },

  async delete(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [tokenHash]);
  },

  async deleteAllForUser(userId: number, userType: UserType = 'user'): Promise<void> {
    if (userType === 'user') {
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    } else {
      await pool.query('DELETE FROM refresh_tokens WHERE orga_id = $1', [userId]);
    }
  }
};

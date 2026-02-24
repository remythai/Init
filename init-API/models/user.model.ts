import pool from '../config/database.js';
import type { UserCreateInput, UserUpdateInput, UserRow, UserPublic } from '../types/index.js';

const USER_ALLOWED_COLUMNS = ['firstname', 'lastname', 'mail', 'tel'] as const;

export const UserModel = {
  async create(userData: UserCreateInput): Promise<UserPublic> {
    const { firstname, lastname, mail, tel, birthday, password_hash } = userData;
    const result = await pool.query(
      `INSERT INTO users (firstname, lastname, mail, tel, birthday, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, firstname, lastname, mail, tel, birthday, created_at`,
      [firstname, lastname, mail, tel, birthday, password_hash]
    );
    return result.rows[0];
  },

  async findByTel(tel: string): Promise<UserRow | undefined> {
    const result = await pool.query(
      'SELECT * FROM users WHERE tel = $1',
      [tel]
    );
    return result.rows[0];
  },

  async findByIdWithHash(id: number): Promise<UserRow | undefined> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
  },

  async findById(id: number): Promise<UserPublic | undefined> {
    const result = await pool.query(
      'SELECT id, firstname, lastname, mail, tel, birthday, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByMail(mail: string): Promise<UserRow | undefined> {
    const result = await pool.query(
      'SELECT * FROM users WHERE mail = $1',
      [mail]
    );
    return result.rows[0];
  },

  async update(id: number, updates: UserUpdateInput): Promise<UserPublic | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    Object.keys(updates)
      .filter(key => (USER_ALLOWED_COLUMNS as readonly string[]).includes(key))
      .forEach(key => {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key as keyof UserUpdateInput]);
        paramCount++;
      });

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, firstname, lastname, mail, tel, birthday, updated_at`,
      values
    );
    return result.rows[0];
  },

  async setLogoutAt(id: number): Promise<void> {
    await pool.query('UPDATE users SET logout_at = NOW() WHERE id = $1', [id]);
  },

  async getLogoutAt(id: number): Promise<Date | null> {
    const result = await pool.query('SELECT logout_at FROM users WHERE id = $1', [id]);
    return result.rows[0]?.logout_at ?? null;
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
};

import pool from '../config/database.js';

export const UserModel = {
  async create(userData) {
    const { firstname, lastname, mail, tel, birthday, password_hash } = userData;
    const result = await pool.query(
      `INSERT INTO users (firstname, lastname, mail, tel, birthday, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, firstname, lastname, mail, tel, birthday, created_at`,
      [firstname, lastname, mail, tel, birthday, password_hash]
    );
    return result.rows[0];
  },

  async findByTel(tel) {
    const result = await pool.query(
      'SELECT * FROM users WHERE tel = $1',
      [tel]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, firstname, lastname, mail, tel, birthday, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByMail(mail) {
    const result = await pool.query(
      'SELECT * FROM users WHERE mail = $1',
      [mail]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
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

  async delete(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
};
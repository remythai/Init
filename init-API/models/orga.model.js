import pool from '../config/database.js';

export const OrgaModel = {
  async create(orgaData) {
    const { name, mail, description, tel, password_hash } = orgaData;
    const result = await pool.query(
      `INSERT INTO orga (nom, mail, description, tel, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nom, mail, description, tel, created_at`,
      [name, mail, description, tel, password_hash]
    );
    return result.rows[0];
  },

  async findByMail(mail) {
    const result = await pool.query(
      'SELECT * FROM orga WHERE mail = $1',
      [mail]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, nom, mail, description, tel, logo_path, created_at, updated_at FROM orga WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const allowedColumns = ['nom', 'description', 'mail', 'tel', 'logo_path'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).filter(key => allowedColumns.includes(key)).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    values.push(id);
    const result = await pool.query(
      `UPDATE orga SET ${fields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, nom, mail, description, tel, logo_path, updated_at`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM orga WHERE id = $1', [id]);
  }
};
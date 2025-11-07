import pool from '../config/database.js';

export const EventModel = {
  async create(eventData) {
    const { orga_id, titre, description, date_debut, date_fin, lieu, custom_fields } = eventData;
    const result = await pool.query(
      `INSERT INTO events (orga_id, titre, description, date_debut, date_fin, lieu, custom_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orga_id, titre, description, date_debut, date_fin, lieu, JSON.stringify(custom_fields)]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT e.*, o.nom as orga_nom, o.mail as orga_mail 
       FROM events e
       JOIN orga o ON e.orga_id = o.id
       WHERE e.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByOrgaId(orgaId) {
    const result = await pool.query(
      `SELECT * FROM events WHERE orga_id = $1 ORDER BY date_debut DESC`,
      [orgaId]
    );
    return result.rows;
  },

  async findAll(filters = {}) {
    let query = `SELECT e.*, o.nom as orga_nom 
                 FROM events e 
                 JOIN orga o ON e.orga_id = o.id 
                 WHERE 1=1`;
    const values = [];
    let paramCount = 1;

    // Filtrer par date future
    if (filters.upcoming) {
      query += ` AND e.date_debut >= NOW()`;
    }

    // Filtrer par lieu
    if (filters.lieu) {
      query += ` AND e.lieu ILIKE $${paramCount}`;
      values.push(`%${filters.lieu}%`);
      paramCount++;
    }

    // Recherche dans titre ou description
    if (filters.search) {
      query += ` AND (e.titre ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ` ORDER BY e.date_debut ASC`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
    }
    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (key === 'custom_fields') {
        fields.push(`${key} = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
      }
      paramCount++;
    });

    values.push(id);
    const result = await pool.query(
      `UPDATE events SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
  },

  async countParticipants(eventId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM user_event_rel WHERE event_id = $1',
      [eventId]
    );
    return parseInt(result.rows[0].count);
  }
};
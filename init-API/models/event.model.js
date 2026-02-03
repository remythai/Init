import pool from '../config/database.js';

export const EventModel = {
  async create(eventData) {
    const {
      orga_id, name, description, start_at, end_at, location,
      app_start_at, app_end_at, theme,
      max_participants, is_public, has_whitelist, has_link_access,
      has_password_access, access_password_hash, cooldown, custom_fields
    } = eventData;

    const result = await pool.query(
      `INSERT INTO events (
        orga_id, name, description, start_at, end_at, location,
        app_start_at, app_end_at, theme,
        max_participants, is_public, has_whitelist, has_link_access,
        has_password_access, access_password_hash, cooldown, custom_fields
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        orga_id, name, description, start_at, end_at, location,
        app_start_at, app_end_at, theme,
        max_participants, is_public, has_whitelist, has_link_access,
        has_password_access, access_password_hash, cooldown,
        JSON.stringify(custom_fields)
      ]
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
      `SELECT * FROM events WHERE orga_id = $1 ORDER BY start_at DESC`,
      [orgaId]
    );
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
  },

  async findPublicEventsWithUserInfo(userId = null, filters = {}) {
    let query = `
      SELECT
        e.id,
        e.name,
        e.location,
        e.max_participants,
        e.event_date,
        e.start_at,
        e.end_at,
        e.app_start_at,
        e.app_end_at,
        e.theme,
        e.description,
        e.custom_fields,
        o.nom as orga_name,
        (SELECT COUNT(*) FROM user_event_rel WHERE event_id = e.id) as participant_count,
        ${userId ? `EXISTS(SELECT 1 FROM user_event_rel WHERE event_id = e.id AND user_id = $1) as is_registered` : 'false as is_registered'},
        ${userId ? `EXISTS(SELECT 1 FROM event_blocked_users WHERE event_id = e.id AND user_id = $1) as is_blocked` : 'false as is_blocked'}
      FROM events e
      JOIN orga o ON e.orga_id = o.id
      WHERE e.is_public = true
    `;
    
    const values = userId ? [userId] : [];
    let paramCount = userId ? 2 : 1;

    if (filters.upcoming) {
      // Show events where app is still available
      query += ` AND e.app_end_at >= NOW()`;
    }

    if (filters.location) {
      query += ` AND e.location ILIKE $${paramCount}`;
      values.push(`%${filters.location}%`);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (e.name ILIKE $${paramCount} OR e.description ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ` ORDER BY e.app_start_at ASC`;

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

  async findUserRegisteredEvents(userId, filters = {}) {
    let query = `
      SELECT
        e.id,
        e.name,
        e.location,
        e.max_participants,
        e.event_date,
        e.start_at,
        e.end_at,
        e.app_start_at,
        e.app_end_at,
        e.theme,
        e.description,
        o.nom as orga_name,
        (SELECT COUNT(*) FROM user_event_rel WHERE event_id = e.id) as participant_count,
        true as is_registered,
        uer.profil_info,
        uer.created_at as registration_date
      FROM events e
      JOIN orga o ON e.orga_id = o.id
      JOIN user_event_rel uer ON e.id = uer.event_id
      WHERE uer.user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 2;

    if (filters.upcoming) {
      // Show events where app is still available
      query += ` AND e.app_end_at >= NOW()`;
    }

    if (filters.past) {
      query += ` AND e.app_end_at < NOW()`;
    }

    query += ` ORDER BY e.app_start_at DESC`;

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
  }
};
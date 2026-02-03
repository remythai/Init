import pool from '../config/database.js';

export const RegistrationModel = {
  async create(userId, eventId, profilInfo) {
    const result = await pool.query(
      `INSERT INTO user_event_rel (user_id, event_id, profil_info)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, eventId, JSON.stringify(profilInfo)]
    );
    return result.rows[0];
  },

  async findByUserAndEvent(userId, eventId) {
    const result = await pool.query(
      `SELECT * FROM user_event_rel WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );
    return result.rows[0];
  },

  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT uer.*, e.name, e.start_at, e.end_at, e.location, o.nom as orga_nom
       FROM user_event_rel uer
       JOIN events e ON uer.event_id = e.id
       JOIN orga o ON e.orga_id = o.id
       WHERE uer.user_id = $1
       ORDER BY e.start_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findByEventId(eventId) {
    const result = await pool.query(
      `SELECT uer.user_id as id, uer.profil_info, uer.created_at as registered_at,
              u.firstname, u.lastname, u.mail, u.tel,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', p.id,
                  'file_path', p.file_path,
                  'is_primary', p.is_primary
                ) ORDER BY p.is_primary DESC, p.display_order ASC)
                FROM photos p
                WHERE p.user_id = u.id
                  AND (p.event_id = $1 OR (p.event_id IS NULL AND NOT EXISTS (
                    SELECT 1 FROM photos WHERE user_id = u.id AND event_id = $1
                  )))
                ), '[]'::json
              ) as photos
       FROM user_event_rel uer
       JOIN users u ON uer.user_id = u.id
       WHERE uer.event_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM event_blocked_users ebu
           WHERE ebu.event_id = $1 AND ebu.user_id = uer.user_id
         )
       ORDER BY uer.created_at DESC`,
      [eventId]
    );
    return result.rows;
  },

  async update(userId, eventId, profilInfo) {
    const result = await pool.query(
      `UPDATE user_event_rel 
       SET profil_info = $1
       WHERE user_id = $2 AND event_id = $3
       RETURNING *`,
      [JSON.stringify(profilInfo), userId, eventId]
    );
    return result.rows[0];
  },

  async delete(userId, eventId) {
    await pool.query(
      'DELETE FROM user_event_rel WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
  }
};
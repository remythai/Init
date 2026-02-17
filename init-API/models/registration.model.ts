import pool from '../config/database.js';
import type { DbClient, RegistrationRow } from '../types/index.js';

export const RegistrationModel = {
  async create(userId: number, eventId: number, profilInfo: Record<string, unknown> | null, client: DbClient = pool): Promise<RegistrationRow> {
    const result = await client.query(
      `INSERT INTO user_event_rel (user_id, event_id, profil_info)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, eventId, JSON.stringify(profilInfo)]
    );
    return result.rows[0];
  },

  async findByUserAndEvent(userId: number, eventId: number): Promise<RegistrationRow | undefined> {
    const result = await pool.query(
      `SELECT * FROM user_event_rel WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );
    return result.rows[0];
  },

  async findByUserId(userId: number): Promise<unknown[]> {
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

  async findByEventId(eventId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
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
       ORDER BY uer.created_at DESC
       LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );
    return result.rows;
  },

  async update(userId: number, eventId: number, profilInfo: Record<string, unknown>): Promise<RegistrationRow | undefined> {
    const result = await pool.query(
      `UPDATE user_event_rel
       SET profil_info = $1
       WHERE user_id = $2 AND event_id = $3
       RETURNING *`,
      [JSON.stringify(profilInfo), userId, eventId]
    );
    return result.rows[0];
  },

  async delete(userId: number, eventId: number, client: DbClient = pool): Promise<void> {
    await client.query(
      'DELETE FROM user_event_rel WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
  },

  async isUserRegistered(userId: number, eventId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT user_id FROM user_event_rel WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
    return result.rows.length > 0;
  },

  async findUserProfileByEvent(userId: number, eventId: number): Promise<{ profil_info: Record<string, unknown>; firstname: string; lastname: string; birthday: Date } | undefined> {
    const result = await pool.query(
      `SELECT uer.profil_info, u.firstname, u.lastname, u.birthday
       FROM user_event_rel uer
       JOIN users u ON uer.user_id = u.id
       WHERE uer.user_id = $1 AND uer.event_id = $2`,
      [userId, eventId]
    );
    return result.rows[0];
  }
};

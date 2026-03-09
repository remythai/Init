import pool from '../config/database.js';
import type { OrgaCreateInput, OrgaUpdateInput, OrgaRow, OrgaPublic } from '../types/index.js';

const ORGA_ALLOWED_COLUMNS = ['nom', 'description', 'mail', 'tel', 'logo_path'] as const;

export const OrgaModel = {
  async create(orgaData: OrgaCreateInput): Promise<OrgaPublic> {
    const { name, mail, description, tel, password_hash } = orgaData;
    const result = await pool.query(
      `INSERT INTO orga (nom, mail, description, tel, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nom, mail, description, tel, created_at`,
      [name, mail, description ?? null, tel ?? null, password_hash]
    );
    return result.rows[0];
  },

  async findByMail(mail: string): Promise<OrgaRow | undefined> {
    const result = await pool.query(
      'SELECT * FROM orga WHERE mail = $1',
      [mail]
    );
    return result.rows[0];
  },

  async findById(id: number): Promise<OrgaPublic | undefined> {
    const result = await pool.query(
      'SELECT id, nom, mail, description, tel, logo_path, created_at, updated_at FROM orga WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async update(id: number, updates: OrgaUpdateInput): Promise<OrgaPublic | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    Object.keys(updates)
      .filter(key => (ORGA_ALLOWED_COLUMNS as readonly string[]).includes(key))
      .forEach(key => {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key as keyof OrgaUpdateInput]);
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

  async setLogoutAt(id: number): Promise<void> {
    await pool.query('UPDATE orga SET logout_at = NOW() WHERE id = $1', [id]);
  },

  async getLogoutAt(id: number): Promise<Date | null> {
    const result = await pool.query('SELECT logout_at FROM orga WHERE id = $1', [id]);
    return result.rows[0]?.logout_at ?? null;
  },

  async findPublicProfile(id: number): Promise<unknown | undefined> {
    const result = await pool.query(`
      SELECT
        o.id,
        o.nom,
        o.description,
        o.logo_path,
        o.created_at,
        (SELECT COUNT(*) FROM events WHERE orga_id = o.id AND is_public = true) as event_count,
        (SELECT COALESCE(SUM(sub.cnt), 0) FROM (
          SELECT COUNT(*) as cnt FROM user_event_rel uer
          JOIN events e ON uer.event_id = e.id
          WHERE e.orga_id = o.id AND e.is_public = true
        ) sub) as total_participants
      FROM orga o
      WHERE o.id = $1
    `, [id]);
    if (!result.rows[0]) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      event_count: parseInt(row.event_count),
      total_participants: parseInt(row.total_participants)
    };
  },

  async findPublicEvents(orgaId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    const result = await pool.query(`
      SELECT
        e.id,
        e.name,
        e.description,
        e.location,
        e.event_date,
        e.start_at,
        e.end_at,
        e.app_start_at,
        e.app_end_at,
        e.theme,
        e.banner_path,
        e.max_participants,
        (SELECT COUNT(*) FROM user_event_rel WHERE event_id = e.id) as participant_count
      FROM events e
      WHERE e.orga_id = $1 AND e.is_public = true
      ORDER BY
        CASE WHEN e.app_end_at >= NOW() THEN 0 ELSE 1 END,
        e.start_at ASC
      LIMIT $2 OFFSET $3
    `, [orgaId, limit, offset]);
    return result.rows;
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM orga WHERE id = $1', [id]);
  }
};

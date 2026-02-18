import pool from '../config/database.js';
import type { DbClient, EventCreateInput, EventUpdateInput, EventFilters, EventSafe, EventStatistics } from '../types/index.js';

function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

const SAFE_COLS = [
  'id', 'orga_id', 'name', 'description', 'start_at', 'end_at', 'event_date',
  'location', 'app_start_at', 'app_end_at', 'theme', 'cooldown', 'max_participants',
  'is_public', 'has_whitelist', 'has_link_access', 'has_password_access',
  'custom_fields', 'banner_path', 'created_at', 'updated_at'
] as const;
const SAFE_COLUMNS = SAFE_COLS.join(', ');
const SAFE_COLUMNS_PREFIXED = SAFE_COLS.map(c => `e.${c}`).join(', ');

const EVENT_ALLOWED_COLUMNS = [
  'name', 'description', 'start_at', 'end_at', 'location',
  'app_start_at', 'app_end_at', 'theme', 'max_participants',
  'is_public', 'has_whitelist', 'has_link_access', 'has_password_access',
  'cooldown', 'access_password_hash', 'custom_fields', 'banner_path'
] as const;

export const EventModel = {
  async create(eventData: EventCreateInput): Promise<EventSafe> {
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
      RETURNING ${SAFE_COLUMNS}`,
      [
        orga_id, name, description ?? null, start_at ?? null, end_at ?? null, location ?? null,
        app_start_at, app_end_at, theme ?? null,
        max_participants ?? null, is_public ?? true, has_whitelist ?? false, has_link_access ?? false,
        has_password_access ?? false, access_password_hash ?? null, cooldown ?? null,
        JSON.stringify(custom_fields ?? [])
      ]
    );
    return result.rows[0];
  },

  async findById(id: number): Promise<(EventSafe & { orga_nom: string; orga_mail: string; orga_logo: string | null }) | undefined> {
    const result = await pool.query(
      `SELECT ${SAFE_COLUMNS_PREFIXED}, o.nom as orga_nom, o.mail as orga_mail, o.logo_path as orga_logo
       FROM events e
       JOIN orga o ON e.orga_id = o.id
       WHERE e.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async getAccessPasswordHash(eventId: number): Promise<string | null | undefined> {
    const result = await pool.query(
      'SELECT access_password_hash FROM events WHERE id = $1',
      [eventId]
    );
    return result.rows[0]?.access_password_hash;
  },

  async findByOrgaId(orgaId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT e.*, o.logo_path as orga_logo
       FROM events e
       JOIN orga o ON e.orga_id = o.id
       WHERE e.orga_id = $1 ORDER BY e.start_at DESC
       LIMIT $2 OFFSET $3`,
      [orgaId, limit, offset]
    );
    return result.rows;
  },

  async update(id: number, updates: EventUpdateInput): Promise<EventSafe | undefined> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    Object.keys(updates)
      .filter(key => (EVENT_ALLOWED_COLUMNS as readonly string[]).includes(key))
      .forEach(key => {
        if (key === 'custom_fields') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(updates[key as keyof EventUpdateInput]));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(updates[key as keyof EventUpdateInput]);
        }
        paramCount++;
      });

    values.push(id);
    const result = await pool.query(
      `UPDATE events SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING ${SAFE_COLUMNS}`,
      values
    );
    return result.rows[0];
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
  },

  async countParticipants(eventId: number, client: DbClient = pool): Promise<number> {
    const result = await client.query(
      'SELECT COUNT(*) as count FROM user_event_rel WHERE event_id = $1',
      [eventId]
    );
    return parseInt(result.rows[0].count);
  },

  async findByIdForUpdate(eventId: number, client: DbClient): Promise<{ max_participants: number | null } | undefined> {
    const result = await client.query(
      'SELECT max_participants FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );
    return result.rows[0];
  },

  async findPublicEventsWithUserInfo(userId: number | null = null, filters: EventFilters = {}): Promise<unknown[]> {
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
        e.banner_path,
        o.nom as orga_name,
        o.logo_path as orga_logo,
        (SELECT COUNT(*) FROM user_event_rel WHERE event_id = e.id) as participant_count,
        ${userId ? `EXISTS(SELECT 1 FROM user_event_rel WHERE event_id = e.id AND user_id = $1) as is_registered` : 'false as is_registered'},
        ${userId ? `EXISTS(SELECT 1 FROM event_blocked_users WHERE event_id = e.id AND user_id = $1) as is_blocked` : 'false as is_blocked'}
      FROM events e
      JOIN orga o ON e.orga_id = o.id
      WHERE e.is_public = true
    `;

    const values: unknown[] = userId ? [userId] : [];
    let paramCount = userId ? 2 : 1;

    if (filters.upcoming) {
      query += ` AND e.app_end_at >= NOW()`;
    }

    if (filters.location) {
      query += ` AND e.location ILIKE $${paramCount} ESCAPE '\\'`;
      values.push(`%${escapeLike(filters.location)}%`);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (e.name ILIKE $${paramCount} ESCAPE '\\' OR e.description ILIKE $${paramCount} ESCAPE '\\')`;
      values.push(`%${escapeLike(filters.search)}%`);
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

  async findUserRegisteredEvents(userId: number, filters: EventFilters = {}): Promise<unknown[]> {
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
        e.banner_path,
        o.nom as orga_name,
        o.logo_path as orga_logo,
        (SELECT COUNT(*) FROM user_event_rel WHERE event_id = e.id) as participant_count,
        true as is_registered,
        uer.profil_info,
        uer.created_at as registration_date
      FROM events e
      JOIN orga o ON e.orga_id = o.id
      JOIN user_event_rel uer ON e.id = uer.event_id
      WHERE uer.user_id = $1
    `;

    const values: unknown[] = [userId];
    let paramCount = 2;

    if (filters.upcoming) {
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
  },

  async getEventRawStatistics(eventId: number): Promise<EventStatistics> {
    const result = await pool.query(`
      WITH
        stats_participants AS (
          SELECT COUNT(*) as total
          FROM user_event_rel uer
          WHERE uer.event_id = $1
            AND NOT EXISTS (
              SELECT 1 FROM event_blocked_users ebu
              WHERE ebu.event_id = $1 AND ebu.user_id = uer.user_id
            )
        ),
        stats_whitelist AS (
          SELECT
            COUNT(*) FILTER (WHERE status = 'active') as total_active,
            COUNT(*) FILTER (WHERE status = 'active' AND user_id IS NOT NULL) as registered,
            COUNT(*) FILTER (WHERE status = 'active' AND user_id IS NULL) as pending,
            COUNT(*) FILTER (WHERE status = 'removed') as removed
          FROM event_whitelist
          WHERE event_id = $1
        ),
        stats_matches AS (
          SELECT
            COUNT(*) as total_matches,
            (SELECT COUNT(DISTINCT user_id) FROM (
              SELECT user1_id as user_id FROM matches WHERE event_id = $1 AND is_archived = false
              UNION
              SELECT user2_id as user_id FROM matches WHERE event_id = $1 AND is_archived = false
            ) u) as users_with_matches
          FROM matches
          WHERE event_id = $1 AND is_archived = false
        ),
        stats_messages AS (
          SELECT
            COUNT(*) as total_messages,
            COUNT(DISTINCT m.sender_id) as users_who_sent,
            COUNT(DISTINCT ma.id) as conversations_with_messages
          FROM messages m
          JOIN matches ma ON m.match_id = ma.id
          WHERE ma.event_id = $1 AND ma.is_archived = false
        ),
        stats_likes AS (
          SELECT
            COUNT(*) as total_swipes,
            COUNT(*) FILTER (WHERE is_like = true) as likes,
            COUNT(*) FILTER (WHERE is_like = false) as passes,
            COUNT(DISTINCT liker_id) as users_who_swiped
          FROM likes l
          WHERE l.event_id = $1
            AND NOT EXISTS (
              SELECT 1 FROM event_blocked_users ebu
              WHERE ebu.event_id = $1 AND ebu.user_id = l.liker_id
            )
        ),
        stats_active AS (
          SELECT COUNT(DISTINCT user_id) as active_users
          FROM (
            SELECT liker_id as user_id FROM likes WHERE event_id = $1
            UNION
            SELECT m.sender_id as user_id
            FROM messages m
            JOIN matches ma ON m.match_id = ma.id
            WHERE ma.event_id = $1 AND ma.is_archived = false
          ) as active
          WHERE EXISTS (
            SELECT 1 FROM user_event_rel uer
            WHERE uer.event_id = $1 AND uer.user_id = active.user_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM event_blocked_users ebu
            WHERE ebu.event_id = $1 AND ebu.user_id = active.user_id
          )
        )
      SELECT
        p.total as participants,
        w.total_active, w.registered, w.pending, w.removed,
        m.total_matches, m.users_with_matches,
        ms.total_messages, ms.users_who_sent, ms.conversations_with_messages,
        l.total_swipes, l.likes, l.passes, l.users_who_swiped,
        a.active_users
      FROM stats_participants p, stats_whitelist w, stats_matches m,
           stats_messages ms, stats_likes l, stats_active a
    `, [eventId]);

    const row = result.rows[0];

    return {
      participants: parseInt(row?.participants || 0),
      whitelist: {
        total_active: parseInt(row?.total_active || 0),
        registered: parseInt(row?.registered || 0),
        pending: parseInt(row?.pending || 0),
        removed: parseInt(row?.removed || 0)
      },
      matches: {
        total_matches: parseInt(row?.total_matches || 0),
        users_with_matches: parseInt(row?.users_with_matches || 0)
      },
      messages: {
        total_messages: parseInt(row?.total_messages || 0),
        users_who_sent: parseInt(row?.users_who_sent || 0),
        conversations_with_messages: parseInt(row?.conversations_with_messages || 0)
      },
      likes: {
        total_swipes: parseInt(row?.total_swipes || 0),
        likes: parseInt(row?.likes || 0),
        passes: parseInt(row?.passes || 0),
        users_who_swiped: parseInt(row?.users_who_swiped || 0)
      },
      activeUsers: parseInt(row?.active_users || 0)
    };
  }
};

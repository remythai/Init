import pool from '../config/database.js';
import type { DbClient, MatchRow, LikeRow, MessageRow } from '../types/index.js';

export const MatchModel = {
  async getProfilesToSwipe(userId: number, eventId: number, limit: number = 10): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT
        u.id as user_id,
        u.firstname,
        u.lastname,
        u.birthday,
        uer.profil_info,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path) ORDER BY p.is_primary DESC, p.display_order ASC)
            FROM photos p
            WHERE p.user_id = u.id
              AND (
                p.event_id = $1
                OR (p.event_id IS NULL AND NOT EXISTS (
                  SELECT 1 FROM photos p2 WHERE p2.user_id = u.id AND p2.event_id = $1
                ))
              )
          ),
          '[]'::json
        ) as photos
      FROM user_event_rel uer
      JOIN users u ON uer.user_id = u.id
      WHERE uer.event_id = $1
        AND uer.user_id != $2
        AND NOT EXISTS (
          SELECT 1 FROM likes l
          WHERE l.liker_id = $2
            AND l.liked_id = uer.user_id
            AND l.event_id = $1
        )
      ORDER BY RANDOM()
      LIMIT $3`,
      [eventId, userId, limit]
    );
    return result.rows;
  },

  async createLike(likerId: number, likedId: number, eventId: number, isLike: boolean, client: DbClient = pool): Promise<LikeRow> {
    const result = await client.query(
      `INSERT INTO likes (liker_id, liked_id, event_id, is_like)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [likerId, likedId, eventId, isLike]
    );
    return result.rows[0];
  },

  async findLike(likerId: number, likedId: number, eventId: number, client: DbClient = pool): Promise<LikeRow | undefined> {
    const result = await client.query(
      `SELECT * FROM likes
       WHERE liker_id = $1 AND liked_id = $2 AND event_id = $3 AND is_like = true`,
      [likerId, likedId, eventId]
    );
    return result.rows[0];
  },

  async hasAlreadySwiped(likerId: number, likedId: number, eventId: number): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM likes
       WHERE liker_id = $1 AND liked_id = $2 AND event_id = $3`,
      [likerId, likedId, eventId]
    );
    return result.rows.length > 0;
  },

  async createMatch(user1Id: number, user2Id: number, eventId: number, client: DbClient = pool): Promise<MatchRow> {
    const [smallerId, largerId] = user1Id < user2Id
      ? [user1Id, user2Id]
      : [user2Id, user1Id];

    const result = await client.query(
      `INSERT INTO matches (user1_id, user2_id, event_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [smallerId, largerId, eventId]
    );
    return result.rows[0];
  },

  async findMatch(user1Id: number, user2Id: number, eventId: number): Promise<MatchRow | undefined> {
    const result = await pool.query(
      `SELECT * FROM matches
       WHERE event_id = $1
         AND LEAST(user1_id, user2_id) = LEAST($2, $3)
         AND GREATEST(user1_id, user2_id) = GREATEST($2, $3)`,
      [eventId, user1Id, user2Id]
    );
    return result.rows[0];
  },

  async findById(matchId: number): Promise<MatchRow | undefined> {
    const result = await pool.query(
      'SELECT * FROM matches WHERE id = $1',
      [matchId]
    );
    return result.rows[0];
  },

  async getMatchesByEvent(userId: number, eventId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT
        m.id as match_id,
        m.created_at,
        u.id as user_id,
        u.firstname,
        u.lastname,
        u.birthday,
        uer.profil_info,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path) ORDER BY p.is_primary DESC, p.display_order ASC)
            FROM photos p
            WHERE p.user_id = u.id
              AND (
                p.event_id = $2
                OR (p.event_id IS NULL AND NOT EXISTS (
                  SELECT 1 FROM photos p2 WHERE p2.user_id = u.id AND p2.event_id = $2
                ))
              )
          ),
          '[]'::json
        ) as photos
      FROM matches m
      JOIN users u ON (
        CASE
          WHEN m.user1_id = $1 THEN m.user2_id
          ELSE m.user1_id
        END = u.id
      )
      LEFT JOIN user_event_rel uer ON uer.user_id = u.id AND uer.event_id = $2
      WHERE m.event_id = $2
        AND (m.user1_id = $1 OR m.user2_id = $1)
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4`,
      [userId, eventId, limit, offset]
    );
    return result.rows;
  },

  async getAllMatches(userId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT
        m.id as match_id,
        m.created_at,
        m.event_id,
        e.name as event_name,
        u.id as user_id,
        u.firstname,
        u.lastname,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path) ORDER BY p.is_primary DESC, p.display_order ASC)
            FROM photos p
            WHERE p.user_id = u.id
              AND (
                p.event_id = m.event_id
                OR (p.event_id IS NULL AND NOT EXISTS (
                  SELECT 1 FROM photos p2 WHERE p2.user_id = u.id AND p2.event_id = m.event_id
                ))
              )
          ),
          '[]'::json
        ) as photos
      FROM matches m
      JOIN events e ON m.event_id = e.id
      JOIN users u ON (
        CASE
          WHEN m.user1_id = $1 THEN m.user2_id
          ELSE m.user1_id
        END = u.id
      )
      WHERE m.user1_id = $1 OR m.user2_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  async getMatchById(matchId: number, userId: number): Promise<(MatchRow & { event_name: string }) | undefined> {
    const result = await pool.query(
      `SELECT m.*, e.name as event_name
       FROM matches m
       JOIN events e ON m.event_id = e.id
       WHERE m.id = $1 AND (m.user1_id = $2 OR m.user2_id = $2)`,
      [matchId, userId]
    );
    return result.rows[0];
  },

  async getUserBasicInfo(userId: number, eventId: number | null = null): Promise<unknown> {
    if (eventId) {
      const result = await pool.query(
        `SELECT
          u.id,
          u.firstname,
          u.lastname,
          COALESCE(
            (
              SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path) ORDER BY p.is_primary DESC, p.display_order ASC)
              FROM photos p
              WHERE p.user_id = u.id
                AND (
                  p.event_id = $2
                  OR (p.event_id IS NULL AND NOT EXISTS (
                    SELECT 1 FROM photos p2 WHERE p2.user_id = u.id AND p2.event_id = $2
                  ))
                )
            ),
            '[]'::json
          ) as photos
        FROM users u
        WHERE u.id = $1`,
        [userId, eventId]
      );
      return result.rows[0];
    }

    const result = await pool.query(
      `SELECT
        u.id,
        u.firstname,
        u.lastname,
        COALESCE(
          (SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path) ORDER BY p.is_primary DESC, p.display_order ASC)
           FROM photos p WHERE p.user_id = u.id),
          '[]'::json
        ) as photos
      FROM users u
      WHERE u.id = $1`,
      [userId]
    );
    return result.rows[0];
  },

  async getMessages(matchId: number, limit: number = 50, beforeId: number | null = null): Promise<MessageRow[]> {
    let query = `
      SELECT
        id,
        sender_id,
        content,
        sent_at,
        is_read,
        is_liked
      FROM messages
      WHERE match_id = $1
    `;
    const values: unknown[] = [matchId];

    if (beforeId) {
      query += ` AND id < $2`;
      values.push(beforeId);
    }

    query += ` ORDER BY sent_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows.reverse();
  },

  async createMessage(matchId: number, senderId: number, content: string): Promise<MessageRow> {
    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [matchId, senderId, content]
    );
    return result.rows[0];
  },

  async getMessageById(messageId: number): Promise<(MessageRow & { user1_id: number; user2_id: number; event_id: number }) | undefined> {
    const result = await pool.query(
      `SELECT m.*, ma.user1_id, ma.user2_id, ma.event_id
       FROM messages m
       JOIN matches ma ON m.match_id = ma.id
       WHERE m.id = $1`,
      [messageId]
    );
    return result.rows[0];
  },

  async markMessageAsRead(messageId: number): Promise<MessageRow | undefined> {
    const result = await pool.query(
      `UPDATE messages SET is_read = true WHERE id = $1 RETURNING *`,
      [messageId]
    );
    return result.rows[0];
  },

  async markAllMessagesAsRead(matchId: number, recipientId: number): Promise<void> {
    await pool.query(
      `UPDATE messages
       SET is_read = true
       WHERE match_id = $1 AND sender_id != $2 AND is_read = false`,
      [matchId, recipientId]
    );
  },

  async toggleMessageLike(messageId: number): Promise<MessageRow | undefined> {
    const result = await pool.query(
      `UPDATE messages SET is_liked = NOT is_liked WHERE id = $1 RETURNING *`,
      [messageId]
    );
    return result.rows[0];
  },

  async getConversationsByEvent(userId: number, eventId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT
        m.id as match_id,
        m.created_at as match_created_at,
        m.is_archived,
        u.id as user_id,
        u.firstname,
        u.lastname,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path) ORDER BY p.is_primary DESC, p.display_order ASC)
            FROM photos p
            WHERE p.user_id = u.id
              AND (
                p.event_id = $2
                OR (p.event_id IS NULL AND NOT EXISTS (
                  SELECT 1 FROM photos p2 WHERE p2.user_id = u.id AND p2.event_id = $2
                ))
              )
          ),
          '[]'::json
        ) as photos,
        (
          SELECT json_build_object(
            'id', msg.id,
            'content', msg.content,
            'sent_at', msg.sent_at,
            'sender_id', msg.sender_id
          )
          FROM messages msg
          WHERE msg.match_id = m.id
          ORDER BY msg.sent_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*)::int
          FROM messages msg
          WHERE msg.match_id = m.id
            AND msg.sender_id != $1
            AND msg.is_read = false
        ) as unread_count
      FROM matches m
      JOIN users u ON (
        CASE
          WHEN m.user1_id = $1 THEN m.user2_id
          ELSE m.user1_id
        END = u.id
      )
      WHERE m.event_id = $2
        AND (m.user1_id = $1 OR m.user2_id = $1)
      ORDER BY COALESCE(
        (SELECT sent_at FROM messages msg WHERE msg.match_id = m.id ORDER BY sent_at DESC LIMIT 1),
        m.created_at
      ) DESC
      LIMIT $3 OFFSET $4`,
      [userId, eventId, limit, offset]
    );
    return result.rows;
  },

  async getAllConversations(userId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    const result = await pool.query(
      `SELECT
        m.id as match_id,
        m.event_id,
        e.name as event_name,
        e.app_end_at,
        m.created_at as match_created_at,
        m.is_archived,
        u.id as user_id,
        u.firstname,
        u.lastname,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path) ORDER BY p.is_primary DESC, p.display_order ASC)
            FROM photos p
            WHERE p.user_id = u.id
              AND (
                p.event_id = m.event_id
                OR (p.event_id IS NULL AND NOT EXISTS (
                  SELECT 1 FROM photos p2 WHERE p2.user_id = u.id AND p2.event_id = m.event_id
                ))
              )
          ),
          '[]'::json
        ) as photos,
        (
          SELECT json_build_object(
            'id', msg.id,
            'content', msg.content,
            'sent_at', msg.sent_at,
            'sender_id', msg.sender_id
          )
          FROM messages msg
          WHERE msg.match_id = m.id
          ORDER BY msg.sent_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*)::int
          FROM messages msg
          WHERE msg.match_id = m.id
            AND msg.sender_id != $1
            AND msg.is_read = false
        ) as unread_count
      FROM matches m
      JOIN events e ON m.event_id = e.id
      JOIN users u ON (
        CASE
          WHEN m.user1_id = $1 THEN m.user2_id
          ELSE m.user1_id
        END = u.id
      )
      WHERE m.user1_id = $1 OR m.user2_id = $1
      ORDER BY COALESCE(
        (SELECT sent_at FROM messages msg WHERE msg.match_id = m.id ORDER BY sent_at DESC LIMIT 1),
        m.created_at
      ) DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  async archiveUserMatchesInEvent(userId: number, eventId: number, client: DbClient = pool): Promise<{ id: number }[]> {
    const result = await client.query(
      `UPDATE matches
       SET is_archived = true
       WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2)
       RETURNING id`,
      [eventId, userId]
    );
    return result.rows;
  },

  async unarchiveUserMatchesInEvent(userId: number, eventId: number): Promise<{ id: number }[]> {
    const result = await pool.query(
      `UPDATE matches
       SET is_archived = false
       WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2)
       RETURNING id`,
      [eventId, userId]
    );
    return result.rows;
  },

  async deleteUserMatchesInEvent(userId: number, eventId: number, client: DbClient = pool): Promise<{ id: number }[]> {
    const matchesResult = await client.query(
      `SELECT id FROM matches
       WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [eventId, userId]
    );
    const matchIds = matchesResult.rows.map((m: { id: number }) => m.id);

    if (matchIds.length > 0) {
      await client.query(
        `DELETE FROM messages WHERE match_id = ANY($1)`,
        [matchIds]
      );
    }

    const result = await client.query(
      `DELETE FROM matches
       WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2)
       RETURNING id`,
      [eventId, userId]
    );
    return result.rows;
  },

  async deleteUserLikesInEvent(userId: number, eventId: number, client: DbClient = pool): Promise<number | null> {
    const result = await client.query(
      `DELETE FROM likes
       WHERE event_id = $1 AND (liker_id = $2 OR liked_id = $2)`,
      [eventId, userId]
    );
    return result.rowCount;
  },

  async isUserInMatch(matchId: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [matchId, userId]
    );
    return result.rows.length > 0;
  },

  async getMatchUserProfile(userId: number, eventId: number): Promise<unknown> {
    const result = await pool.query(
      `SELECT
        u.id as user_id,
        u.firstname,
        u.lastname,
        u.birthday,
        uer.profil_info,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path) ORDER BY p.is_primary DESC, p.display_order ASC)
            FROM photos p
            WHERE p.user_id = u.id
              AND (
                p.event_id = $2
                OR (p.event_id IS NULL AND NOT EXISTS (
                  SELECT 1 FROM photos p2 WHERE p2.user_id = u.id AND p2.event_id = $2
                ))
              )
          ),
          '[]'::json
        ) as photos
      FROM users u
      LEFT JOIN user_event_rel uer ON uer.user_id = u.id AND uer.event_id = $2
      WHERE u.id = $1`,
      [userId, eventId]
    );
    return result.rows[0];
  }
};

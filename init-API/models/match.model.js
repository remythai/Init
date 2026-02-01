import pool from '../config/database.js';

export const MatchModel = {
  /**
   * Get profiles to swipe for a given event
   * Excludes: self, already swiped profiles
   * Photos: prioritizes event-specific photos, falls back to general photos
   */
  async getProfilesToSwipe(userId, eventId, limit = 10) {
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

  /**
   * Record a like or pass
   */
  async createLike(likerId, likedId, eventId, isLike) {
    const result = await pool.query(
      `INSERT INTO likes (liker_id, liked_id, event_id, is_like)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [likerId, likedId, eventId, isLike]
    );
    return result.rows[0];
  },

  /**
   * Check if a like exists (for mutual like detection)
   */
  async findLike(likerId, likedId, eventId) {
    const result = await pool.query(
      `SELECT * FROM likes
       WHERE liker_id = $1 AND liked_id = $2 AND event_id = $3 AND is_like = true`,
      [likerId, likedId, eventId]
    );
    return result.rows[0];
  },

  /**
   * Check if user has already swiped on target
   */
  async hasAlreadySwiped(likerId, likedId, eventId) {
    const result = await pool.query(
      `SELECT 1 FROM likes
       WHERE liker_id = $1 AND liked_id = $2 AND event_id = $3`,
      [likerId, likedId, eventId]
    );
    return result.rows.length > 0;
  },

  /**
   * Create a match between two users for an event
   */
  async createMatch(user1Id, user2Id, eventId) {
    // Always store with smaller id first for consistency
    const [smallerId, largerId] = user1Id < user2Id
      ? [user1Id, user2Id]
      : [user2Id, user1Id];

    const result = await pool.query(
      `INSERT INTO matches (user1_id, user2_id, event_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [smallerId, largerId, eventId]
    );
    return result.rows[0];
  },

  /**
   * Find a match between two users for an event
   */
  async findMatch(user1Id, user2Id, eventId) {
    const result = await pool.query(
      `SELECT * FROM matches
       WHERE event_id = $1
         AND LEAST(user1_id, user2_id) = LEAST($2, $3)
         AND GREATEST(user1_id, user2_id) = GREATEST($2, $3)`,
      [eventId, user1Id, user2Id]
    );
    return result.rows[0];
  },

  /**
   * Get all matches for a user on a specific event
   * Photos: prioritizes event-specific photos, falls back to general photos
   */
  async getMatchesByEvent(userId, eventId) {
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
      ORDER BY m.created_at DESC`,
      [userId, eventId]
    );
    return result.rows;
  },

  /**
   * Get all matches for a user (all events)
   */
  async getAllMatches(userId) {
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
          (SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path))
           FROM photos p WHERE p.user_id = u.id),
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
      ORDER BY m.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Get match by ID (for future messaging)
   */
  async getMatchById(matchId, userId) {
    const result = await pool.query(
      `SELECT m.*, e.name as event_name
       FROM matches m
       JOIN events e ON m.event_id = e.id
       WHERE m.id = $1 AND (m.user1_id = $2 OR m.user2_id = $2)`,
      [matchId, userId]
    );
    return result.rows[0];
  },

  /**
   * Get user basic info (for match response)
   */
  async getUserBasicInfo(userId) {
    const result = await pool.query(
      `SELECT
        u.id,
        u.firstname,
        u.lastname,
        COALESCE(
          (SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path))
           FROM photos p WHERE p.user_id = u.id),
          '[]'::json
        ) as photos
      FROM users u
      WHERE u.id = $1`,
      [userId]
    );
    return result.rows[0];
  },

  // =========================================================================
  // MESSAGING
  // =========================================================================

  /**
   * Get messages for a match
   */
  async getMessages(matchId, limit = 50, beforeId = null) {
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
    const values = [matchId];

    if (beforeId) {
      query += ` AND id < $2`;
      values.push(beforeId);
    }

    query += ` ORDER BY sent_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const result = await pool.query(query, values);
    return result.rows.reverse(); // Return in chronological order
  },

  /**
   * Create a new message
   */
  async createMessage(matchId, senderId, content) {
    const result = await pool.query(
      `INSERT INTO messages (match_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [matchId, senderId, content]
    );
    return result.rows[0];
  },

  /**
   * Get message by ID
   */
  async getMessageById(messageId) {
    const result = await pool.query(
      `SELECT m.*, ma.user1_id, ma.user2_id, ma.event_id
       FROM messages m
       JOIN matches ma ON m.match_id = ma.id
       WHERE m.id = $1`,
      [messageId]
    );
    return result.rows[0];
  },

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId) {
    const result = await pool.query(
      `UPDATE messages SET is_read = true WHERE id = $1 RETURNING *`,
      [messageId]
    );
    return result.rows[0];
  },

  /**
   * Mark all messages in a match as read (for recipient)
   */
  async markAllMessagesAsRead(matchId, recipientId) {
    await pool.query(
      `UPDATE messages
       SET is_read = true
       WHERE match_id = $1 AND sender_id != $2 AND is_read = false`,
      [matchId, recipientId]
    );
  },

  /**
   * Toggle like on a message
   */
  async toggleMessageLike(messageId) {
    const result = await pool.query(
      `UPDATE messages SET is_liked = NOT is_liked WHERE id = $1 RETURNING *`,
      [messageId]
    );
    return result.rows[0];
  },

  /**
   * Get conversations for a specific event
   * Photos: prioritizes event-specific photos, falls back to general photos
   */
  async getConversationsByEvent(userId, eventId) {
    const result = await pool.query(
      `SELECT
        m.id as match_id,
        m.created_at as match_created_at,
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
      ) DESC`,
      [userId, eventId]
    );
    return result.rows;
  },

  /**
   * Get all conversations grouped by event
   * Photos: prioritizes event-specific photos, falls back to general photos
   */
  async getAllConversations(userId) {
    const result = await pool.query(
      `SELECT
        m.id as match_id,
        m.event_id,
        e.name as event_name,
        m.created_at as match_created_at,
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
      ) DESC`,
      [userId]
    );
    return result.rows;
  }
};

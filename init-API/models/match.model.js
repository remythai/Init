import pool from '../config/database.js';

export const MatchModel = {
  /**
   * Get profiles to swipe for a given event
   * Excludes: self, already swiped profiles
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
          (SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path))
           FROM photos p WHERE p.user_id = u.id),
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
          (SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path))
           FROM photos p WHERE p.user_id = u.id),
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
  }
};

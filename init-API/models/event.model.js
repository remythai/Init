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
      `SELECT e.*, o.nom as orga_nom, o.mail as orga_mail, o.logo_path as orga_logo
       FROM events e
       JOIN orga o ON e.orga_id = o.id
       WHERE e.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByOrgaId(orgaId) {
    const result = await pool.query(
      `SELECT e.*, o.logo_path as orga_logo
       FROM events e
       JOIN orga o ON e.orga_id = o.id
       WHERE e.orga_id = $1 ORDER BY e.start_at DESC`,
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
  },

  /**
   * Get comprehensive statistics for an event
   */
  async getEventStatistics(eventId) {
    // Get all stats in parallel for better performance
    const [
      participantsResult,
      whitelistResult,
      matchesResult,
      messagesResult,
      likesResult,
      activeUsersResult
    ] = await Promise.all([
      // Total participants (not blocked)
      pool.query(`
        SELECT COUNT(*) as total
        FROM user_event_rel uer
        WHERE uer.event_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM event_blocked_users ebu
            WHERE ebu.event_id = $1 AND ebu.user_id = uer.user_id
          )
      `, [eventId]),

      // Whitelist stats
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') as total_active,
          COUNT(*) FILTER (WHERE status = 'active' AND user_id IS NOT NULL) as registered,
          COUNT(*) FILTER (WHERE status = 'active' AND user_id IS NULL) as pending,
          COUNT(*) FILTER (WHERE status = 'removed') as removed
        FROM event_whitelist
        WHERE event_id = $1
      `, [eventId]),

      // Match stats
      pool.query(`
        SELECT
          COUNT(*) as total_matches,
          COUNT(DISTINCT user1_id) + COUNT(DISTINCT user2_id) as users_with_matches
        FROM matches
        WHERE event_id = $1 AND is_archived = false
      `, [eventId]),

      // Message stats
      pool.query(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(DISTINCT m.sender_id) as users_who_sent,
          COUNT(DISTINCT ma.id) as conversations_with_messages
        FROM messages m
        JOIN matches ma ON m.match_id = ma.id
        WHERE ma.event_id = $1
      `, [eventId]),

      // Likes stats (swipes)
      pool.query(`
        SELECT
          COUNT(*) as total_swipes,
          COUNT(*) FILTER (WHERE is_like = true) as likes,
          COUNT(*) FILTER (WHERE is_like = false) as passes,
          COUNT(DISTINCT liker_id) as users_who_swiped
        FROM likes
        WHERE event_id = $1
      `, [eventId]),

      // Active users (who did something: swiped or sent message)
      pool.query(`
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM (
          SELECT liker_id as user_id FROM likes WHERE event_id = $1
          UNION
          SELECT m.sender_id as user_id
          FROM messages m
          JOIN matches ma ON m.match_id = ma.id
          WHERE ma.event_id = $1
        ) as active
      `, [eventId])
    ]);

    const participants = parseInt(participantsResult.rows[0]?.total || 0);
    const whitelist = whitelistResult.rows[0] || { total_active: 0, registered: 0, pending: 0, removed: 0 };
    const matches = matchesResult.rows[0] || { total_matches: 0, users_with_matches: 0 };
    const messages = messagesResult.rows[0] || { total_messages: 0, users_who_sent: 0, conversations_with_messages: 0 };
    const likes = likesResult.rows[0] || { total_swipes: 0, likes: 0, passes: 0, users_who_swiped: 0 };
    const activeUsers = parseInt(activeUsersResult.rows[0]?.active_users || 0);

    // Calculate derived stats
    const totalMatches = parseInt(matches.total_matches || 0);
    const totalLikes = parseInt(likes.likes || 0);
    const totalSwipes = parseInt(likes.total_swipes || 0);
    const totalMessages = parseInt(messages.total_messages || 0);
    const conversationsWithMessages = parseInt(messages.conversations_with_messages || 0);

    return {
      participants: {
        total: participants,
        active: activeUsers,
        engagement_rate: participants > 0 ? Math.round((activeUsers / participants) * 100) : 0
      },
      whitelist: {
        total: parseInt(whitelist.total_active || 0),
        registered: parseInt(whitelist.registered || 0),
        pending: parseInt(whitelist.pending || 0),
        removed: parseInt(whitelist.removed || 0),
        conversion_rate: parseInt(whitelist.total_active || 0) > 0
          ? Math.round((parseInt(whitelist.registered || 0) / parseInt(whitelist.total_active || 0)) * 100)
          : 0
      },
      matching: {
        total_matches: totalMatches,
        average_matches_per_user: participants > 0 ? Math.round((totalMatches * 2 / participants) * 10) / 10 : 0,
        // Reciprocity rate: % of likes that were mutual (each match = 2 mutual likes)
        reciprocity_rate: totalLikes > 0 ? Math.round((totalMatches * 2 / totalLikes) * 100) : 0
      },
      swipes: {
        total: totalSwipes,
        likes: totalLikes,
        passes: parseInt(likes.passes || 0),
        users_who_swiped: parseInt(likes.users_who_swiped || 0),
        like_rate: totalSwipes > 0 ? Math.round((totalLikes / totalSwipes) * 100) : 0
      },
      messages: {
        total: totalMessages,
        users_who_sent: parseInt(messages.users_who_sent || 0),
        conversations_active: conversationsWithMessages,
        average_per_conversation: totalMatches > 0 ? Math.round((totalMessages / totalMatches) * 10) / 10 : 0
      }
    };
  }
};
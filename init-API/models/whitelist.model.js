import pool from '../config/database.js';
import { normalizePhone } from '../utils/phone.js';

export const WhitelistModel = {
  /**
   * Add a phone to whitelist
   * If allowReactivate is true, will reactivate a previously removed phone
   */
  async addPhone(eventId, phone, source = 'manual', allowReactivate = true) {
    const normalizedPhone = normalizePhone(phone);

    // First check if the phone exists and its current status
    const existing = await pool.query(
      `SELECT status FROM event_whitelist WHERE event_id = $1 AND phone = $2`,
      [eventId, normalizedPhone]
    );
    const wasRemoved = existing.rows.length > 0 && existing.rows[0].status === 'removed';

    // If allowReactivate is true (manual add), reactivate removed phones
    // If false (bulk import), skip removed phones to prevent accidental reactivation
    const result = await pool.query(
      `INSERT INTO event_whitelist (event_id, phone, source, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (event_id, phone) DO UPDATE
       SET status = CASE
         WHEN event_whitelist.status = 'removed' AND $4 = true THEN 'active'
         WHEN event_whitelist.status = 'removed' THEN event_whitelist.status
         ELSE 'active'
       END,
       removed_at = CASE
         WHEN event_whitelist.status = 'removed' AND $4 = true THEN NULL
         ELSE event_whitelist.removed_at
       END,
       source = CASE
         WHEN event_whitelist.status = 'removed' AND $4 = false THEN event_whitelist.source
         ELSE EXCLUDED.source
       END,
       updated_at = CURRENT_TIMESTAMP
       RETURNING *,
         (xmax = 0) as is_new`,
      [eventId, normalizedPhone, source, allowReactivate]
    );

    const entry = result.rows[0];
    // Determine the outcome based on pre-check and result
    entry.was_removed = wasRemoved && !allowReactivate;
    entry.was_reactivated = wasRemoved && allowReactivate && entry.status === 'active';

    return entry;
  },

  /**
   * Add multiple phones (for import)
   * Returns stats about the import
   */
  async addPhonesBulk(eventId, phones, source) {
    const stats = {
      total: phones.length,
      added: 0,
      skipped_duplicate: 0,
      skipped_removed: 0,
      invalid: 0,
      errors: []
    };

    for (const phone of phones) {
      if (!isValidPhone(phone)) {
        stats.invalid++;
        stats.errors.push({ phone, reason: 'Format invalide' });
        continue;
      }

      try {
        // Pass allowReactivate = false for bulk imports to prevent accidental reactivation
        const result = await this.addPhone(eventId, phone, source, false);
        if (result.is_new) {
          stats.added++;
        } else if (result.was_removed) {
          stats.skipped_removed++;
        } else {
          stats.skipped_duplicate++;
        }
      } catch (error) {
        stats.errors.push({ phone, reason: error.message });
      }
    }

    return stats;
  },

  /**
   * Get whitelist for an event
   */
  async getByEventId(eventId, includeRemoved = false) {
    let query = `
      SELECT w.*, u.firstname, u.lastname
      FROM event_whitelist w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE w.event_id = $1
    `;

    if (!includeRemoved) {
      query += ` AND w.status = 'active'`;
    }

    query += ` ORDER BY w.created_at DESC`;

    const result = await pool.query(query, [eventId]);
    return result.rows;
  },

  /**
   * Find whitelist entry by phone
   */
  async findByPhone(eventId, phone) {
    const normalizedPhone = normalizePhone(phone);
    const result = await pool.query(
      `SELECT w.*, u.firstname, u.lastname
       FROM event_whitelist w
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.event_id = $1 AND w.phone = $2`,
      [eventId, normalizedPhone]
    );
    return result.rows[0];
  },

  /**
   * Update phone in whitelist
   */
  async updatePhone(eventId, oldPhone, newPhone) {
    const normalizedOld = normalizePhone(oldPhone);
    const normalizedNew = normalizePhone(newPhone);

    const result = await pool.query(
      `UPDATE event_whitelist
       SET phone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE event_id = $1 AND phone = $2
       RETURNING *`,
      [eventId, normalizedOld, normalizedNew]
    );
    return result.rows[0];
  },

  /**
   * Soft remove (archive) - keeps history, archives matches
   */
  async softRemove(eventId, phone) {
    const normalizedPhone = normalizePhone(phone);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get whitelist entry with user info
      const whitelistResult = await client.query(
        `UPDATE event_whitelist
         SET status = 'removed', removed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE event_id = $1 AND phone = $2
         RETURNING *`,
        [eventId, normalizedPhone]
      );

      if (whitelistResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const whitelist = whitelistResult.rows[0];

      if (whitelist.user_id) {
        // Remove from event registration
        await client.query(
          `DELETE FROM user_event_rel WHERE user_id = $1 AND event_id = $2`,
          [whitelist.user_id, eventId]
        );

        // Archive matches (don't delete, just mark as archived)
        await client.query(
          `UPDATE matches
           SET is_archived = true
           WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2)`,
          [eventId, whitelist.user_id]
        );

        // Remove likes for this event
        await client.query(
          `DELETE FROM likes WHERE event_id = $1 AND (liker_id = $2 OR liked_id = $2)`,
          [eventId, whitelist.user_id]
        );
      }

      await client.query('COMMIT');
      return whitelist;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Permanent delete - removes everything
   */
  async permanentDelete(eventId, phone) {
    const normalizedPhone = normalizePhone(phone);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get whitelist entry first
      const whitelistResult = await client.query(
        `DELETE FROM event_whitelist
         WHERE event_id = $1 AND phone = $2
         RETURNING *`,
        [eventId, normalizedPhone]
      );

      if (whitelistResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const whitelist = whitelistResult.rows[0];

      if (whitelist.user_id) {
        // Remove from event registration
        await client.query(
          `DELETE FROM user_event_rel WHERE user_id = $1 AND event_id = $2`,
          [whitelist.user_id, eventId]
        );

        // Delete matches (cascades to messages)
        await client.query(
          `DELETE FROM matches
           WHERE event_id = $1 AND (user1_id = $2 OR user2_id = $2)`,
          [eventId, whitelist.user_id]
        );

        // Delete likes
        await client.query(
          `DELETE FROM likes WHERE event_id = $1 AND (liker_id = $2 OR liked_id = $2)`,
          [eventId, whitelist.user_id]
        );
      }

      await client.query('COMMIT');
      return whitelist;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Reactivate a removed phone
   */
  async reactivate(eventId, phone) {
    const normalizedPhone = normalizePhone(phone);
    const result = await pool.query(
      `UPDATE event_whitelist
       SET status = 'active', removed_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE event_id = $1 AND phone = $2 AND status = 'removed'
       RETURNING *`,
      [eventId, normalizedPhone]
    );
    return result.rows[0];
  },

  /**
   * Check if a phone is whitelisted (active) for an event
   */
  async isWhitelisted(eventId, phone) {
    const normalizedPhone = normalizePhone(phone);
    const result = await pool.query(
      `SELECT 1 FROM event_whitelist
       WHERE event_id = $1 AND phone = $2 AND status = 'active'`,
      [eventId, normalizedPhone]
    );
    return result.rows.length > 0;
  },

  /**
   * Link user to whitelist entry when they register on platform
   */
  async linkUser(phone, userId) {
    const normalizedPhone = normalizePhone(phone);
    await pool.query(
      `UPDATE event_whitelist
       SET user_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE phone = $1 AND user_id IS NULL`,
      [normalizedPhone, userId]
    );
  },

  /**
   * Get all events where this phone is whitelisted
   */
  async getWhitelistedEvents(phone) {
    const normalizedPhone = normalizePhone(phone);
    const result = await pool.query(
      `SELECT e.id, e.name, e.start_at, e.end_at, e.location, w.status
       FROM event_whitelist w
       JOIN events e ON w.event_id = e.id
       WHERE w.phone = $1 AND w.status = 'active'
       ORDER BY e.start_at`,
      [normalizedPhone]
    );
    return result.rows;
  }
};

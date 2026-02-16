import pool from '../config/database.js';

class PhotoModel {
  /**
   * Create a new photo record
   */
  async create({ userId, filePath, eventId = null, displayOrder = 0, isPrimary = false }) {
    if (isPrimary) {
      await this.unsetPrimaryForContext(userId, eventId);
    }

    const result = await pool.query(
      `INSERT INTO photos (user_id, file_path, event_id, display_order, is_primary, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, filePath, eventId, displayOrder, isPrimary]
    );
    return result.rows[0];
  }

  /**
   * Find photo by ID
   */
  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM photos WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Find all photos for a user (general photos only, no event_id)
   */
  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT * FROM photos
       WHERE user_id = $1 AND event_id IS NULL
       ORDER BY is_primary DESC, display_order ASC, created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Find photos for a user in a specific event
   */
  async findByUserAndEvent(userId, eventId) {
    const result = await pool.query(
      `SELECT * FROM photos
       WHERE user_id = $1 AND event_id = $2
       ORDER BY is_primary DESC, display_order ASC, created_at DESC`,
      [userId, eventId]
    );
    return result.rows;
  }

  /**
   * Find all photos for a user (general + event-specific)
   * Used to get complete photo list
   */
  async findAllByUserId(userId) {
    const result = await pool.query(
      `SELECT p.*, e.name as event_name
       FROM photos p
       LEFT JOIN events e ON p.event_id = e.id
       WHERE p.user_id = $1
       ORDER BY p.event_id NULLS FIRST, p.is_primary DESC, p.display_order ASC, p.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get photos for swiper - returns event-specific photos OR general photos if no event photos
   */
  async findForSwiper(userId, eventId) {
    const result = await pool.query(
      `SELECT * FROM photos
       WHERE user_id = $1
         AND (event_id = $2 OR (event_id IS NULL AND NOT EXISTS (
           SELECT 1 FROM photos WHERE user_id = $1 AND event_id = $2
         )))
       ORDER BY
         CASE WHEN event_id = $2 THEN 0 ELSE 1 END,
         is_primary DESC,
         display_order ASC,
         created_at DESC`,
      [userId, eventId]
    );
    return result.rows;
  }

  /**
   * Update photo
   */
  async update(id, { displayOrder, isPrimary }) {
    const photo = await this.findById(id);
    if (!photo) return null;

    if (isPrimary) {
      await this.unsetPrimaryForContext(photo.user_id, photo.event_id);
    }

    const result = await pool.query(
      `UPDATE photos
       SET display_order = COALESCE($1, display_order),
           is_primary = COALESCE($2, is_primary)
       WHERE id = $3
       RETURNING *`,
      [displayOrder, isPrimary, id]
    );
    return result.rows[0];
  }

  /**
   * Set a photo as primary for its context
   */
  async setPrimary(id) {
    const photo = await this.findById(id);
    if (!photo) return null;

    await this.unsetPrimaryForContext(photo.user_id, photo.event_id);

    const result = await pool.query(
      `UPDATE photos SET is_primary = true WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Unset primary flag for all photos in a context (user + event)
   */
  async unsetPrimaryForContext(userId, eventId) {
    if (eventId) {
      await pool.query(
        `UPDATE photos SET is_primary = false
         WHERE user_id = $1 AND event_id = $2 AND is_primary = true`,
        [userId, eventId]
      );
    } else {
      await pool.query(
        `UPDATE photos SET is_primary = false
         WHERE user_id = $1 AND event_id IS NULL AND is_primary = true`,
        [userId]
      );
    }
  }

  /**
   * Delete a photo
   */
  async delete(id) {
    const result = await pool.query(
      'DELETE FROM photos WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Count photos for a user in a context
   */
  async countByUserAndEvent(userId, eventId = null) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM photos
       WHERE user_id = $1 AND ${eventId ? 'event_id = $2' : 'event_id IS NULL'}`,
      eventId ? [userId, eventId] : [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Reorder photos for a user in a context
   */
  async reorder(userId, eventId, photoIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < photoIds.length; i++) {
        await client.query(
          `UPDATE photos SET display_order = $1
           WHERE id = $2 AND user_id = $3 AND ${eventId ? 'event_id = $4' : 'event_id IS NULL'}`,
          eventId ? [i, photoIds[i], userId, eventId] : [i, photoIds[i], userId]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new PhotoModel();

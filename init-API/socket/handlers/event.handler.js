import pool from '../../config/database.js';

/**
 * Event Socket Handlers
 * Handles real-time event events (user joins, etc.)
 */
export const registerEventHandlers = (io, socket) => {
  const userId = socket.user.id;

  socket.on('event:join', async (eventId) => {
    const result = await pool.query(
      'SELECT user_id FROM user_event_rel WHERE user_id = $1 AND event_id = $2',
      [userId, eventId]
    );
    if (result.rows.length === 0) return;

    const roomName = `event:${eventId}`;
    socket.join(roomName);
  });

  socket.on('event:leave', (eventId) => {
    const roomName = `event:${eventId}`;
    socket.leave(roomName);
  });
};

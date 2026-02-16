import pool from '../../config/database.js';

/**
 * Chat Socket Handlers
 * Handles real-time chat events
 */
export const registerChatHandlers = (io, socket) => {
  const userId = socket.user.id;

  socket.on('chat:join', async (matchId) => {
    const result = await pool.query(
      'SELECT id FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [matchId, userId]
    );
    if (result.rows.length === 0) return;

    const roomName = `match:${matchId}`;
    socket.join(roomName);
  });

  socket.on('chat:leave', (matchId) => {
    const roomName = `match:${matchId}`;
    socket.leave(roomName);
  });

  socket.on('chat:typing', ({ matchId, isTyping }) => {
    const roomName = `match:${matchId}`;
    if (!socket.rooms.has(roomName)) return;
    socket.to(roomName).emit('chat:typing', {
      matchId,
      userId,
      isTyping
    });
  });

  socket.on('chat:markRead', ({ matchId, messageId }) => {
    const roomName = `match:${matchId}`;
    if (!socket.rooms.has(roomName)) return;
    socket.to(roomName).emit('chat:messageRead', {
      matchId,
      messageId,
      readBy: userId
    });
  });
};

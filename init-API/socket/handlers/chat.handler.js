/**
 * Chat Socket Handlers
 * Handles real-time chat events
 */
export const registerChatHandlers = (io, socket) => {
  const userId = socket.user.id;

  socket.on('chat:join', (matchId) => {
    const roomName = `match:${matchId}`;
    socket.join(roomName);
    console.log(`User ${userId} joined chat room ${roomName}`);
  });

  socket.on('chat:leave', (matchId) => {
    const roomName = `match:${matchId}`;
    socket.leave(roomName);
    console.log(`User ${userId} left chat room ${roomName}`);
  });

  socket.on('chat:typing', ({ matchId, isTyping }) => {
    const roomName = `match:${matchId}`;
    socket.to(roomName).emit('chat:typing', {
      matchId,
      userId,
      isTyping
    });
  });

  socket.on('chat:markRead', ({ matchId, messageId }) => {
    const roomName = `match:${matchId}`;
    socket.to(roomName).emit('chat:messageRead', {
      matchId,
      messageId,
      readBy: userId
    });
  });
};

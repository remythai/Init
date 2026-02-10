/**
 * Event Socket Handlers
 * Handles real-time event events (user joins, etc.)
 */
export const registerEventHandlers = (io, socket) => {
  const userId = socket.user.id;

  socket.on('event:join', (eventId) => {
    const roomName = `event:${eventId}`;
    socket.join(roomName);
    console.log(`User ${userId} joined event room ${roomName}`);
  });

  socket.on('event:leave', (eventId) => {
    const roomName = `event:${eventId}`;
    socket.leave(roomName);
    console.log(`User ${userId} left event room ${roomName}`);
  });
};

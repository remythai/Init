/**
 * Event Socket Handlers
 * Handles real-time event events (user joins, etc.)
 */
export const registerEventHandlers = (io, socket) => {
  const userId = socket.user.id;

  // Join an event room to receive notifications
  socket.on('event:join', (eventId) => {
    const roomName = `event:${eventId}`;
    socket.join(roomName);
    console.log(`User ${userId} joined event room ${roomName}`);
  });

  // Leave an event room
  socket.on('event:leave', (eventId) => {
    const roomName = `event:${eventId}`;
    socket.leave(roomName);
    console.log(`User ${userId} left event room ${roomName}`);
  });
};

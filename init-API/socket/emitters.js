/**
 * Socket Event Emitters
 * Utility functions to emit socket events from controllers
 */

let io = null;

/**
 * Initialize the emitter with the Socket.io instance
 */
export const initEmitters = (socketIo) => {
  io = socketIo;
};

/**
 * Get the Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    console.warn('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit a new message to a match conversation
 * @param {number} matchId - The match/conversation ID
 * @param {object} message - The message object
 * @param {number} senderId - The sender's user ID
 */
export const emitNewMessage = (matchId, message, senderId) => {
  if (!io) return;

  const roomName = `match:${matchId}`;
  io.to(roomName).emit('chat:newMessage', {
    matchId,
    message,
    senderId
  });

  console.log(`Emitted chat:newMessage to room ${roomName}`);
};

/**
 * Emit to a specific user's personal room
 * @param {number} userId - The user ID
 * @param {string} event - The event name
 * @param {object} data - The data to emit
 */
export const emitToUser = (userId, event, data) => {
  if (!io) return;

  const roomName = `user:${userId}`;
  io.to(roomName).emit(event, data);

  console.log(`Emitted ${event} to user room ${roomName}`);
};

/**
 * Emit a new match notification to both users
 * @param {number} user1Id - First user ID
 * @param {number} user2Id - Second user ID
 * @param {object} matchData - The match data
 */
export const emitNewMatch = (user1Id, user2Id, matchData) => {
  if (!io) return;

  // Emit to both users
  emitToUser(user1Id, 'match:new', matchData);
  emitToUser(user2Id, 'match:new', matchData);

  console.log(`Emitted match:new to users ${user1Id} and ${user2Id}`);
};

/**
 * Emit when a new user joins an event
 * @param {number} eventId - The event ID
 * @param {object} userData - Basic user data (id, firstname, photos)
 */
export const emitUserJoinedEvent = (eventId, userData) => {
  if (!io) return;

  const roomName = `event:${eventId}`;
  io.to(roomName).emit('event:userJoined', {
    eventId,
    user: userData
  });

  console.log(`Emitted event:userJoined to room ${roomName}`);
};

/**
 * Emit conversation update (new message preview for conversation list)
 * @param {number} userId - The user to notify
 * @param {object} conversationData - Updated conversation data
 */
export const emitConversationUpdate = (userId, conversationData) => {
  if (!io) return;

  emitToUser(userId, 'chat:conversationUpdate', conversationData);
};

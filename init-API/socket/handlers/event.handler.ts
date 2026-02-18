import { Server } from 'socket.io';
import { RegistrationModel } from '../../models/registration.model.js';
import type { AuthenticatedSocket } from '../../types/index.js';

export const registerEventHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const userId: number = socket.user.id;

  socket.on('event:join', async (eventId: number) => {
    const isRegistered = await RegistrationModel.isUserRegistered(userId, eventId);
    if (!isRegistered) return;

    const roomName = `event:${eventId}`;
    socket.join(roomName);
  });

  socket.on('event:leave', (eventId: number) => {
    const roomName = `event:${eventId}`;
    socket.leave(roomName);
  });
};

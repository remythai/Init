import { Server } from 'socket.io';
import { RegistrationModel } from '../../models/registration.model.js';
import type { AuthenticatedSocket } from '../../types/index.js';

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

export const registerEventHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const userId: number = socket.user.id;

  socket.on('event:join', async (eventId: unknown) => {
    if (!isPositiveInt(eventId)) return;
    const isRegistered = await RegistrationModel.isUserRegistered(userId, eventId);
    if (!isRegistered) return;

    const roomName = `event:${eventId}`;
    socket.join(roomName);
  });

  socket.on('event:leave', (eventId: unknown) => {
    if (!isPositiveInt(eventId)) return;
    const roomName = `event:${eventId}`;
    socket.leave(roomName);
  });
};

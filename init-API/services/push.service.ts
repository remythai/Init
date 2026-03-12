import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

const expo = new Expo();

export const PushService = {
  async saveToken(userId: number, role: 'user' | 'orga', pushToken: string): Promise<void> {
    const table = role === 'orga' ? 'orga' : 'users';
    await pool.query(
      `UPDATE ${table} SET push_token = $1 WHERE id = $2`,
      [pushToken, userId]
    );
    logger.info({ userId, role, pushToken }, 'Push token saved');
  },

  async removeToken(userId: number, role: 'user' | 'orga'): Promise<void> {
    const table = role === 'orga' ? 'orga' : 'users';
    await pool.query(
      `UPDATE ${table} SET push_token = NULL WHERE id = $1`,
      [userId]
    );
  },

  async getToken(userId: number, role: 'user' | 'orga' = 'user'): Promise<string | null> {
    const table = role === 'orga' ? 'orga' : 'users';
    const result = await pool.query(
      `SELECT push_token FROM ${table} WHERE id = $1`,
      [userId]
    );
    return result.rows[0]?.push_token ?? null;
  },

  async sendNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    channelId: string = 'messages'
  ): Promise<ExpoPushTicket | null> {
    if (!Expo.isExpoPushToken(pushToken)) {
      logger.warn({ pushToken }, 'Invalid Expo push token');
      return null;
    }

    const collapseKey = data?.collapseKey as string | undefined;
    const message: ExpoPushMessage & { _collapseKey?: string } = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
      channelId,
      ...(collapseKey ? { _collapseKey: collapseKey } : {}),
    };

    try {
      const [ticket] = await expo.sendPushNotificationsAsync([message]);
      logger.info({ ticket, title }, 'Push notification sent');
      return ticket;
    } catch (error) {
      logger.error({ error, pushToken, title }, 'Failed to send push notification');
      return null;
    }
  },

  async sendToUser(
    userId: number,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    role: 'user' | 'orga' = 'user',
    channelId: string = 'messages'
  ): Promise<void> {
    const token = await this.getToken(userId, role);
    if (token) {
      logger.info({ userId, title }, 'Sending push notification');
      await this.sendNotification(token, title, body, data, channelId);
    } else {
      logger.warn({ userId, role }, 'No push token found for user, skipping notification');
    }
  },
};

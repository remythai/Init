import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || resolve('firebase-service-account.json');

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  logger.info('Firebase Admin SDK initialized');
} catch (error) {
  logger.error({ error }, 'Failed to initialize Firebase Admin SDK — push notifications will not work');
}

export const PushService = {
  async saveToken(userId: number, role: 'user' | 'orga', pushToken: string): Promise<void> {
    const table = role === 'orga' ? 'orga' : 'users';
    await pool.query(
      `UPDATE ${table} SET push_token = $1 WHERE id = $2`,
      [pushToken, userId]
    );
    logger.info({ userId, role }, 'Push token saved');
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
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    channelId: string = 'messages'
  ): Promise<string | null> {
    if (!admin.apps?.length) {
      logger.warn('Firebase not initialized, skipping notification');
      return null;
    }

    // FCM data values must be strings
    const stringData: Record<string, string> = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (key === 'collapseKey') continue;
        stringData[key] = String(value);
      }
    }

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          channelId,
          sound: 'default',
          priority: 'high',
          ...(data?.collapseKey ? { tag: String(data.collapseKey) } : {}),
        },
        ...(data?.collapseKey ? { collapseKey: String(data.collapseKey) } : {}),
      },
    };

    try {
      const messageId = await admin.messaging().send(message);
      logger.info({ messageId, title }, 'Push notification sent via FCM');
      return messageId;
    } catch (error: any) {
      // Clean up invalid tokens
      if (error?.code === 'messaging/registration-token-not-registered' ||
          error?.code === 'messaging/invalid-registration-token') {
        logger.warn({ fcmToken }, 'Invalid FCM token, should be cleaned up');
      } else {
        logger.error({ error, fcmToken, title }, 'Failed to send FCM notification');
      }
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

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenModel } from '../models/token.model.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';
import type { UserType } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET!;

export const AuthService = {
  async generateTokens(entityId: number, role: UserType): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = jwt.sign(
      { id: entityId, role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    await TokenModel.create(entityId, refreshToken, expiry, role);

    return { accessToken, refreshToken };
  },

  async rotateRefreshToken(cookieToken: string | undefined): Promise<{ accessToken: string; refreshToken: string }> {
    if (!cookieToken) {
      throw new ValidationError('Refresh token requis');
    }

    const tokenEntry = await TokenModel.findValidToken(cookieToken);
    if (!tokenEntry) {
      throw new UnauthorizedError('Refresh token invalide ou expiré');
    }

    const entityId = tokenEntry.user_id || tokenEntry.orga_id;
    const role = tokenEntry.user_type;

    await TokenModel.delete(cookieToken);

    const accessToken = jwt.sign(
      { id: entityId, role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    await TokenModel.create(entityId!, newRefreshToken, expiry, role);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async revokeRefreshToken(cookieToken: string | undefined): Promise<void> {
    if (cookieToken) {
      await TokenModel.delete(cookieToken);
    }
  }
};

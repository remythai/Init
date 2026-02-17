import argon2 from 'argon2';
import { UserModel } from '../models/user.model.js';
import { TokenModel } from '../models/token.model.js';
import { normalizePhone } from '../utils/phone.js';
import { deleteUserPhotosDir } from '../config/multer.config.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';
import { AuthService } from './auth.service.js';

export const UserService = {
  async register(data: { firstname: string; lastname: string; mail?: string; tel: string; birthday: string; password: string }) {
    const password_hash = await argon2.hash(data.password);

    return UserModel.create({
      firstname: data.firstname,
      lastname: data.lastname,
      mail: data.mail?.toLowerCase(),
      tel: normalizePhone(data.tel)!,
      birthday: data.birthday,
      password_hash
    });
  },

  async login(tel: string, password: string) {
    const user = await UserModel.findByTel(normalizePhone(tel)!);
    let valid = false;
    try {
      if (user?.password_hash) {
        valid = await argon2.verify(user.password_hash, password);
      }
    } catch {}
    if (!user || !valid) {
      throw new UnauthorizedError('Identifiants incorrects');
    }

    const tokens = await AuthService.generateTokens(user.id, 'user');

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        tel: user.tel,
        mail: user.mail
      }
    };
  },

  async updateProfile(userId: number, data: { firstname?: string; lastname?: string; mail?: string; tel?: string }) {
    const updates: Record<string, unknown> = {};

    if (data.firstname) updates.firstname = data.firstname;
    if (data.lastname) updates.lastname = data.lastname;
    if (data.mail) updates.mail = data.mail.toLowerCase();
    if (data.tel) updates.tel = normalizePhone(data.tel);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    return UserModel.update(userId, updates);
  },

  async deleteAccount(userId: number) {
    await TokenModel.deleteAllForUser(userId, 'user');
    deleteUserPhotosDir(userId);
    await UserModel.delete(userId);
  }
};

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../models/user.model.js';
import { TokenModel } from '../models/token.model.js';
import { normalizePhone } from '../utils/phone.js';
import { deleteUserPhotosDir } from '../config/multer.config.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookie.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const UserController = {
  async register(req, res) {
    const { firstname, lastname, mail, tel, birthday, password } = req.body;

    const password_hash = await argon2.hash(password);

    const user = await UserModel.create({
      firstname,
      lastname,
      mail: mail?.toLowerCase(),
      tel: normalizePhone(tel),
      birthday,
      password_hash
    });

    return created(res, user, 'Utilisateur créé avec succès');
  },

  async login(req, res) {
    const { tel, password } = req.body;

    const user = await UserModel.findByTel(normalizePhone(tel));
    let valid = false;
    try {
      if (user?.password_hash) {
        valid = await argon2.verify(user.password_hash, password);
      }
    } catch {}
    if (!user || !valid) {
      throw new UnauthorizedError('Identifiants incorrects');
    }

    const accessToken = jwt.sign(
      { id: user.id, role: 'user' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    await TokenModel.create(user.id, refreshToken, expiry, 'user');

    setRefreshCookie(res, refreshToken);

    return success(res, {
      accessToken,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        tel: user.tel,
        mail: user.mail
      }
    }, 'Connexion réussie');
  },

  async refreshToken(req, res) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ValidationError('Refresh token requis');
    }

    const tokenEntry = await TokenModel.findValidToken(refreshToken);
    if (!tokenEntry) {
      throw new UnauthorizedError('Refresh token invalide ou expiré');
    }

    const entityId = tokenEntry.user_id || tokenEntry.orga_id;
    const role = tokenEntry.user_type;

    await TokenModel.delete(refreshToken);

    const accessToken = jwt.sign(
      { id: entityId, role: role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    await TokenModel.create(entityId, newRefreshToken, expiry, role);

    setRefreshCookie(res, newRefreshToken);

    return success(res, { accessToken }, 'Token rafraîchi');
  },

  async logout(req, res) {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await TokenModel.delete(refreshToken);
    }

    clearRefreshCookie(res);

    return success(res, null, 'Déconnexion réussie');
  },

  async getProfile(req, res) {
    const user = await UserModel.findById(req.user.id);
    
    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    return success(res, user);
  },

  async updateProfile(req, res) {
    const { firstname, lastname, mail, tel } = req.body;
    const updates = {};

    if (firstname) updates.firstname = firstname;
    if (lastname) updates.lastname = lastname;
    if (mail) updates.mail = mail.toLowerCase();
    if (tel) updates.tel = normalizePhone(tel);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    const user = await UserModel.update(req.user.id, updates);
    return success(res, user, 'Profil mis à jour');
  },

  async deleteAccount(req, res) {
    await TokenModel.deleteAllForUser(req.user.id, 'user');
    deleteUserPhotosDir(req.user.id);
    await UserModel.delete(req.user.id);
    return success(res, null, 'Compte supprimé');
  }
};
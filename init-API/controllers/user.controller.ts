import type { Request, Response } from 'express';
import { UserModel } from '../models/user.model.js';
import { NotFoundError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookie.js';
import { disconnectUser } from '../socket/emitters.js';
import { PushService } from '../services/push.service.js';

export const UserController = {
  async register(req: Request, res: Response): Promise<void> {
    const user = await UserService.register(req.body);
    created(res, user, 'Utilisateur créé avec succès');
  },

  async login(req: Request, res: Response): Promise<void> {
    const { tel, password } = req.body;
    const result = await UserService.login(tel, password);
    setRefreshCookie(res, result.refreshToken);
    success(res, { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user }, 'Connexion réussie');
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const tokens = await AuthService.rotateRefreshToken(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    success(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }, 'Token rafraîchi');
  },

  async logout(req: Request, res: Response): Promise<void> {
    await AuthService.revokeRefreshToken(req.cookies?.refreshToken || req.body?.refreshToken);
    if (req.user) {
      await UserModel.setLogoutAt(req.user.id);
      disconnectUser(req.user.id);
    }
    clearRefreshCookie(res);
    success(res, null, 'Déconnexion réussie');
  },

  async getProfile(req: Request, res: Response): Promise<void> {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }
    success(res, user);
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const user = await UserService.updateProfile(req.user!.id, req.body);
    success(res, user, 'Profil mis à jour');
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    await UserService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    clearRefreshCookie(res);
    success(res, null, 'Mot de passe modifié, veuillez vous reconnecter');
  },

  async savePushToken(req: Request, res: Response): Promise<void> {
    const { pushToken } = req.body;
    if (!pushToken) {
      res.status(400).json({ error: 'pushToken requis' });
      return;
    }
    await PushService.saveToken(req.user!.id, 'user', pushToken);
    success(res, null, 'Push token enregistré');
  },

  async deletePushToken(req: Request, res: Response): Promise<void> {
    await PushService.removeToken(req.user!.id, 'user');
    success(res, null, 'Push token supprimé');
  },

  async deleteAccount(req: Request, res: Response): Promise<void> {
    await UserService.deleteAccount(req.user!.id);
    clearRefreshCookie(res);
    success(res, null, 'Compte supprimé');
  }
};

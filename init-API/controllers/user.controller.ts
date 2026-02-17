import type { Request, Response } from 'express';
import { UserModel } from '../models/user.model.js';
import { NotFoundError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookie.js';

export const UserController = {
  async register(req: Request, res: Response): Promise<void> {
    const user = await UserService.register(req.body);
    created(res, user, 'Utilisateur créé avec succès');
  },

  async login(req: Request, res: Response): Promise<void> {
    const { tel, password } = req.body;
    const result = await UserService.login(tel, password);
    setRefreshCookie(res, result.refreshToken);
    success(res, { accessToken: result.accessToken, user: result.user }, 'Connexion réussie');
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    const tokens = await AuthService.rotateRefreshToken(req.cookies?.refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    success(res, { accessToken: tokens.accessToken }, 'Token rafraîchi');
  },

  async logout(req: Request, res: Response): Promise<void> {
    await AuthService.revokeRefreshToken(req.cookies?.refreshToken);
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

  async deleteAccount(req: Request, res: Response): Promise<void> {
    await UserService.deleteAccount(req.user!.id);
    success(res, null, 'Compte supprimé');
  }
};

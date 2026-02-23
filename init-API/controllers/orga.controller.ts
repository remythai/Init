import type { Request, Response } from 'express';
import { OrgaModel } from '../models/orga.model.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { setRefreshCookie, clearRefreshCookie } from '../utils/cookie.js';
import { disconnectUser } from '../socket/emitters.js';
import { success, created } from '../utils/responses.js';
import { AuthService } from '../services/auth.service.js';
import { OrgaService } from '../services/orga.service.js';

export const OrgaController = {
  async register(req: Request, res: Response): Promise<void> {
    const orga = await OrgaService.register(req.body);
    created(res, orga, 'Organisation créée avec succès');
  },

  async login(req: Request, res: Response): Promise<void> {
    const { mail, password } = req.body;
    const result = await OrgaService.login(mail, password);
    setRefreshCookie(res, result.refreshToken);
    success(res, { accessToken: result.accessToken, orga: result.orga }, 'Connexion réussie');
  },

  async getProfile(req: Request, res: Response): Promise<void> {
    const orga = await OrgaModel.findById(req.user!.id);
    if (!orga) {
      throw new NotFoundError('Organisation non trouvée');
    }
    success(res, orga);
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const orga = await OrgaService.updateProfile(req.user!.id, req.body);
    success(res, orga, 'Profil mis à jour');
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    const tokens = await AuthService.rotateRefreshToken(req.cookies?.refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    success(res, { accessToken: tokens.accessToken }, 'Token rafraîchi');
  },

  async logout(req: Request, res: Response): Promise<void> {
    await AuthService.revokeRefreshToken(req.cookies?.refreshToken);
    if (req.user) {
      await OrgaModel.setLogoutAt(req.user.id);
      disconnectUser(req.user.id);
    }
    clearRefreshCookie(res);
    success(res, null, 'Déconnexion réussie');
  },

  async deleteAccount(req: Request, res: Response): Promise<void> {
    await OrgaService.deleteAccount(req.user!.id);
    success(res, null, 'Compte supprimé');
  },

  async uploadLogo(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new ValidationError('Aucun fichier uploadé');
    }
    const result = await OrgaService.uploadLogo(req.user!.id, req.file.filename);
    success(res, result, 'Logo uploadé avec succès');
  },

  async deleteLogo(req: Request, res: Response): Promise<void> {
    await OrgaService.deleteLogo(req.user!.id);
    success(res, null, 'Logo supprimé avec succès');
  }
};

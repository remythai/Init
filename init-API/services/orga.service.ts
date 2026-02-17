import argon2 from 'argon2';
import { OrgaModel } from '../models/orga.model.js';
import { TokenModel } from '../models/token.model.js';
import { EventModel } from '../models/event.model.js';
import { normalizePhone } from '../utils/phone.js';
import { getOrgaLogoUrl, deleteOrgaLogo, deleteOrgaDir, deleteEventDir } from '../config/multer.config.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';
import { AuthService } from './auth.service.js';

export const OrgaService = {
  async register(data: { name: string; mail: string; description?: string; tel?: string; password: string }) {
    const password_hash = await argon2.hash(data.password);

    return OrgaModel.create({
      name: data.name,
      mail: data.mail.toLowerCase(),
      description: data.description,
      tel: normalizePhone(data.tel) ?? undefined,
      password_hash
    });
  },

  async login(mail: string, password: string) {
    if (!mail || !password) {
      throw new ValidationError('Email et mot de passe requis');
    }

    const orga = await OrgaModel.findByMail(mail.toLowerCase());
    let valid = false;
    try {
      if (orga?.password_hash) {
        valid = await argon2.verify(orga.password_hash, password);
      }
    } catch {}
    if (!orga || !valid) {
      throw new UnauthorizedError('Identifiants incorrects');
    }

    const tokens = await AuthService.generateTokens(orga.id, 'orga');

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      orga: {
        id: orga.id,
        nom: orga.nom,
        mail: orga.mail,
        description: orga.description
      }
    };
  },

  async updateProfile(orgaId: number, data: { nom?: string; mail?: string; description?: string; tel?: string }) {
    const updates: Record<string, unknown> = {};

    if (data.nom) updates.nom = data.nom;
    if (data.description !== undefined) updates.description = data.description;
    if (data.mail) updates.mail = data.mail.toLowerCase();
    if (data.tel) updates.tel = normalizePhone(data.tel);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    return OrgaModel.update(orgaId, updates);
  },

  async deleteAccount(orgaId: number) {
    const events = await EventModel.findByOrgaId(orgaId) as Array<{ id: number }>;
    for (const event of events) {
      deleteEventDir(event.id);
    }
    deleteOrgaDir(orgaId);
    await TokenModel.deleteAllForUser(orgaId, 'orga');
    await OrgaModel.delete(orgaId);
  },

  async uploadLogo(orgaId: number, filename: string) {
    const logoPath = getOrgaLogoUrl(orgaId, filename);
    const orga = await OrgaModel.update(orgaId, { logo_path: logoPath });
    return { logo_path: orga!.logo_path };
  },

  async deleteLogo(orgaId: number) {
    deleteOrgaLogo(orgaId);
    await OrgaModel.update(orgaId, { logo_path: null });
  }
};

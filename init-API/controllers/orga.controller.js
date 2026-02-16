import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OrgaModel } from '../models/orga.model.js';
import { TokenModel } from '../models/token.model.js';
import { normalizePhone } from '../utils/phone.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';
import { getOrgaLogoUrl, deleteOrgaLogo, deleteOrgaDir, deleteEventDir } from '../config/multer.config.js';
import { EventModel } from '../models/event.model.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const OrgaController = {
  async register(req, res) {
    const { name, mail, description, tel, password } = req.body;

    // Beta: restrict organizer registration to allowed emails only
    const allowedOrgaEmails = ['mtech.bdx1@gmail.com'];
    if (!allowedOrgaEmails.includes(mail.toLowerCase())) {
      throw new ValidationError('Cette adresse email n\'est pas autorisée à créer un compte organisateur');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const orga = await OrgaModel.create({
      name,
      mail,
      description,
      tel: normalizePhone(tel),
      password_hash
    });

    return created(res, orga, 'Organisation créée avec succès');
  },

  async login(req, res) {
    const { mail, password } = req.body;

    if (!mail || !password) {
      throw new ValidationError('Email et mot de passe requis');
    }

    const orga = await OrgaModel.findByMail(mail);
    const hash = orga?.password_hash || '$2b$10$dummyhashtopreventtimingattack000000000000000000000';
    const valid = await bcrypt.compare(password, hash);
    if (!orga || !valid) {
      throw new UnauthorizedError('Identifiants incorrects');
    }

    const accessToken = jwt.sign(
      { id: orga.id, role: 'orga' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    await TokenModel.create(orga.id, refreshToken, expiry, 'orga');

    return success(res, {
      accessToken,
      refreshToken,
      orga: {
        id: orga.id,
        nom: orga.nom,
        mail: orga.mail,
        description: orga.description
      }
    }, 'Connexion réussie');
  },

  async getProfile(req, res) {
    const orga = await OrgaModel.findById(req.user.id);
    
    if (!orga) {
      throw new NotFoundError('Organisation non trouvée');
    }

    return success(res, orga);
  },

  async updateProfile(req, res) {
    const { nom, mail, description, tel } = req.body;
    const updates = {};

    if (nom) updates.nom = nom;
    if (description !== undefined) updates.description = description;
    if (mail) updates.mail = mail;
    if (tel) updates.tel = normalizePhone(tel);

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    const orga = await OrgaModel.update(req.user.id, updates);
    return success(res, orga, 'Profil mis à jour');
  },

  async refreshToken(req, res) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token requis');
    }

    const tokenEntry = await TokenModel.findValidToken(refreshToken);
    if (!tokenEntry) {
      throw new UnauthorizedError('Refresh token invalide ou expiré');
    }

    const entityId = tokenEntry.orga_id || tokenEntry.user_id;
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

    return success(res, { accessToken, refreshToken: newRefreshToken }, 'Token rafraîchi');
  },

  async logout(req, res) {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await TokenModel.delete(refreshToken);
    }

    return success(res, null, 'Déconnexion réussie');
  },

  async deleteAccount(req, res) {
    const events = await EventModel.findByOrgaId(req.user.id);
    for (const event of events) {
      deleteEventDir(event.id);
    }
    deleteOrgaDir(req.user.id);
    await TokenModel.deleteAllForUser(req.user.id, 'orga');
    await OrgaModel.delete(req.user.id);
    return success(res, null, 'Compte supprimé');
  },

  async uploadLogo(req, res) {
    if (!req.file) {
      throw new ValidationError('Aucun fichier uploadé');
    }

    const orgaId = req.user.id;
    const logoPath = getOrgaLogoUrl(orgaId, req.file.filename);

    const orga = await OrgaModel.update(orgaId, { logo_path: logoPath });

    return success(res, { logo_path: orga.logo_path }, 'Logo uploadé avec succès');
  },

  async deleteLogo(req, res) {
    const orgaId = req.user.id;

    deleteOrgaLogo(orgaId);
    await OrgaModel.update(orgaId, { logo_path: null });

    return success(res, null, 'Logo supprimé avec succès');
  }
};
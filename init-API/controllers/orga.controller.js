import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OrgaModel } from '../models/orga.model.js';
import { TokenModel } from '../models/token.model.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const OrgaController = {
  async register(req, res) {
    const { nom, mail, description, tel, password } = req.body;

    // Validation
    if (!nom || !mail || !password) {
      throw new ValidationError('Nom, email et mot de passe sont requis');
    }

    if (password.length < 8) {
      throw new ValidationError('Le mot de passe doit contenir au moins 8 caractères');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      throw new ValidationError('Format d\'email invalide');
    }

    if (tel) {
      const telRegex = /^[0-9+\s()-]{10,20}$/;
      if (!telRegex.test(tel)) {
        throw new ValidationError('Format de téléphone invalide');
      }
    }

    const password_hash = await bcrypt.hash(password, 10);

    const orga = await OrgaModel.create({
      nom,
      mail,
      description,
      tel,
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
    if (!orga) {
      throw new UnauthorizedError('Identifiants incorrects');
    }

    const valid = await bcrypt.compare(password, orga.password_hash);
    if (!valid) {
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

    await TokenModel.create(orga.id, refreshToken, expiry);

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
    if (mail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(mail)) {
        throw new ValidationError('Format d\'email invalide');
      }
      updates.mail = mail;
    }
    if (tel) {
      const telRegex = /^[0-9+\s()-]{10,20}$/;
      if (!telRegex.test(tel)) {
        throw new ValidationError('Format de téléphone invalide');
      }
      updates.tel = tel;
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    const orga = await OrgaModel.update(req.user.id, updates);
    return success(res, orga, 'Profil mis à jour');
  }
};
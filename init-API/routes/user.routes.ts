import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import { validate } from '../middleware/validation.middleware.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Créer un nouveau compte utilisateur
 *     tags: [Users, Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email ou téléphone déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', registerLimiter, validate('userRegister'), asyncHandler(UserController.register));

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Se connecter avec téléphone et mot de passe
 *     tags: [Users, Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       401:
 *         description: Identifiants incorrects
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error: 'Identifiants incorrects'
 */
router.post('/login', authLimiter, validate('userLogin'), asyncHandler(UserController.login));

/**
 * @swagger
 * /api/users/refresh:
 *   post:
 *     summary: Rafraîchir le token d'accès
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token obtenu lors de la connexion
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *       401:
 *         description: Refresh token invalide ou expiré
 */
router.post('/refresh', authLimiter, asyncHandler(UserController.refreshToken));

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Se déconnecter
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token à invalider
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/logout', optionalAuthMiddleware, asyncHandler(UserController.logout));

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Récupérer le profil de l'utilisateur connecté
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  '/me',
  authMiddleware,
  requireRole('user'),
  asyncHandler(UserController.getProfile)
);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Mettre à jour le profil de l'utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               lastname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               mail:
 *                 type: string
 *                 format: email
 *               tel:
 *                 type: string
 *             example:
 *               firstname: Jean
 *               lastname: Martin
 *               mail: jean.martin@example.com
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put(
  '/me',
  authMiddleware,
  requireRole('user'),
  validate('userUpdate'),
  asyncHandler(UserController.updateProfile)
);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Supprimer le compte utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compte supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put(
  '/me/password',
  authMiddleware,
  requireRole('user'),
  validate('userChangePassword'),
  asyncHandler(UserController.changePassword)
);

router.delete(
  '/me',
  authMiddleware,
  requireRole('user'),
  asyncHandler(UserController.deleteAccount)
);

export default router;

import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { photoUpload } from '../config/multer.config.js';
import { PhotoController } from '../controllers/photo.controller.js';

const router = Router();

// All routes require authentication as user
router.use(authMiddleware);
router.use(requireRole('user'));

/**
 * @swagger
 * /api/users/photos:
 *   post:
 *     summary: Upload a photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Photo file (JPEG, PNG, WebP, max 5MB)
 *               eventId:
 *                 type: integer
 *                 description: Event ID (optional, null for general profile photo)
 *               isPrimary:
 *                 type: boolean
 *                 description: Set as primary photo
 *     responses:
 *       201:
 *         description: Photo uploaded successfully
 *       400:
 *         description: Invalid file or limit reached
 */
router.post('/', uploadLimiter, photoUpload.single('photo'), asyncHandler(PhotoController.uploadPhoto));

/**
 * @swagger
 * /api/users/photos:
 *   get:
 *     summary: Get user's photos
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: integer
 *         description: Event ID to filter photos (optional)
 *     responses:
 *       200:
 *         description: Photos retrieved successfully
 */
router.get('/', asyncHandler(PhotoController.getPhotos));

/**
 * @swagger
 * /api/users/photos/all:
 *   get:
 *     summary: Get all user's photos (general + event-specific)
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All photos retrieved and grouped
 */
router.get('/all', asyncHandler(PhotoController.getAllPhotos));

/**
 * @swagger
 * /api/users/photos/reorder:
 *   put:
 *     summary: Reorder photos
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - photoIds
 *             properties:
 *               photoIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of photo IDs in desired order
 *               eventId:
 *                 type: integer
 *                 description: Event ID (optional, null for general photos)
 *     responses:
 *       200:
 *         description: Photos reordered successfully
 */
router.put('/reorder', asyncHandler(PhotoController.reorderPhotos));

/**
 * @swagger
 * /api/users/photos/copy-to-event:
 *   post:
 *     summary: Copy photos to an event
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *             properties:
 *               eventId:
 *                 type: integer
 *                 description: Target event ID
 *               photoIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Specific photo IDs to copy (optional, copies all if not provided)
 *     responses:
 *       201:
 *         description: Photos copied successfully
 */
router.post('/copy-to-event', asyncHandler(PhotoController.copyPhotosToEvent));

/**
 * @swagger
 * /api/users/photos/{id}:
 *   delete:
 *     summary: Delete a photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Photo deleted successfully
 *       404:
 *         description: Photo not found
 */
router.delete('/:id', asyncHandler(PhotoController.deletePhoto));

/**
 * @swagger
 * /api/users/photos/{id}/primary:
 *   put:
 *     summary: Set a photo as primary
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Photo ID
 *     responses:
 *       200:
 *         description: Photo set as primary successfully
 *       404:
 *         description: Photo not found
 */
router.put('/:id/primary', asyncHandler(PhotoController.setPrimaryPhoto));

export default router;

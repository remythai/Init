import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const PHOTOS_DIR = path.join(UPLOAD_DIR, 'photos');
const ORGA_DIR = path.join(UPLOAD_DIR, 'orga');
const EVENTS_DIR = path.join(UPLOAD_DIR, 'events');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}
if (!fs.existsSync(ORGA_DIR)) {
  fs.mkdirSync(ORGA_DIR, { recursive: true });
}
if (!fs.existsSync(EVENTS_DIR)) {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

// Max file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific directory
    const userId = req.user?.id;
    if (!userId) {
      return cb(new Error('User ID required'), null);
    }

    const userDir = path.join(PHOTOS_DIR, String(userId));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé. Types acceptés: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
  }
};

// Multer instance for photo uploads
export const photoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // One file at a time
  }
});

// Multer instance for multiple photos
export const photosUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 6 // Max 6 photos at once
  }
});

// Helper to get public URL path for a photo
export const getPhotoUrl = (userId, filename) => {
  return `/uploads/photos/${userId}/${filename}`;
};

// Helper to get full file path
export const getPhotoPath = (userId, filename) => {
  return path.join(PHOTOS_DIR, String(userId), filename);
};

// Helper to delete a photo file
export const deletePhotoFile = (filePath) => {
  const fullPath = path.join(UPLOAD_DIR, '..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
};

// ============ ORGA LOGO UPLOAD ============

// Storage for orga logos
const orgaLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgaId = req.user?.id;
    if (!orgaId) {
      return cb(new Error('Orga ID required'), null);
    }

    const orgaDir = path.join(ORGA_DIR, String(orgaId));
    if (!fs.existsSync(orgaDir)) {
      fs.mkdirSync(orgaDir, { recursive: true });
    }

    cb(null, orgaDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo${ext}`);
  }
});

// Multer instance for orga logo upload
export const orgaLogoUpload = multer({
  storage: orgaLogoStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Helper to get orga logo URL
export const getOrgaLogoUrl = (orgaId, filename) => {
  return `/uploads/orga/${orgaId}/${filename}`;
};

// Helper to delete orga logo
export const deleteOrgaLogo = (orgaId) => {
  const orgaDir = path.join(ORGA_DIR, String(orgaId));
  if (fs.existsSync(orgaDir)) {
    const files = fs.readdirSync(orgaDir);
    for (const file of files) {
      if (file.startsWith('logo')) {
        fs.unlinkSync(path.join(orgaDir, file));
        return true;
      }
    }
  }
  return false;
};

// ============ EVENT BANNER UPLOAD ============

// Storage for event banners
const eventBannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const eventId = req.params.id;
    if (!eventId) {
      return cb(new Error('Event ID required'), null);
    }

    const eventDir = path.join(EVENTS_DIR, String(eventId));
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }

    cb(null, eventDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `banner${ext}`);
  }
});

// Multer instance for event banner upload
export const eventBannerUpload = multer({
  storage: eventBannerStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Helper to get event banner URL
export const getEventBannerUrl = (eventId, filename) => {
  return `/uploads/events/${eventId}/${filename}`;
};

// Helper to delete event banner
export const deleteEventBanner = (eventId) => {
  const eventDir = path.join(EVENTS_DIR, String(eventId));
  if (fs.existsSync(eventDir)) {
    const files = fs.readdirSync(eventDir);
    for (const file of files) {
      if (file.startsWith('banner')) {
        fs.unlinkSync(path.join(eventDir, file));
        return true;
      }
    }
  }
  return false;
};

export { UPLOAD_DIR, PHOTOS_DIR, ORGA_DIR, EVENTS_DIR };

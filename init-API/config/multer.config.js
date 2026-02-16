import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const PHOTOS_DIR = path.join(UPLOAD_DIR, 'photos');
const ORGA_DIR = path.join(UPLOAD_DIR, 'orga');
const EVENTS_DIR = path.join(UPLOAD_DIR, 'events');

function resolveUploadPath(filePath) {
  const fullPath = path.resolve(UPLOAD_DIR, '..', filePath);
  if (!fullPath.startsWith(path.resolve(UPLOAD_DIR))) {
    throw new Error('Chemin de fichier invalide');
  }
  return fullPath;
}

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

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé. Types acceptés: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
  }
};

export const photoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

export const photosUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 6
  }
});

export const stripExif = async (filePath) => {
  const fullPath = resolveUploadPath(filePath);
  try {
    const buffer = await sharp(fullPath).rotate().toBuffer();
    await sharp(buffer).toFile(fullPath);
  } catch {
    throw new Error('Le fichier n\'est pas une image valide');
  }
};

export const getPhotoUrl = (userId, filename) => {
  return `/uploads/photos/${userId}/${filename}`;
};

export const getPhotoPath = (userId, filename) => {
  return path.join(PHOTOS_DIR, String(userId), filename);
};

export const deletePhotoFile = (filePath) => {
  const fullPath = resolveUploadPath(filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
};

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

export const orgaLogoUpload = multer({
  storage: orgaLogoStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

export const getOrgaLogoUrl = (orgaId, filename) => {
  return `/uploads/orga/${orgaId}/${filename}`;
};

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

export const eventBannerUpload = multer({
  storage: eventBannerStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

export const getEventBannerUrl = (eventId, filename) => {
  return `/uploads/events/${eventId}/${filename}`;
};

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

export const deleteUserPhotosDir = (userId) => {
  const userDir = path.join(PHOTOS_DIR, String(userId));
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true });
    return true;
  }
  return false;
};

export const deleteOrgaDir = (orgaId) => {
  const orgaDir = path.join(ORGA_DIR, String(orgaId));
  if (fs.existsSync(orgaDir)) {
    fs.rmSync(orgaDir, { recursive: true });
    return true;
  }
  return false;
};

export const deleteEventDir = (eventId) => {
  const eventDir = path.join(EVENTS_DIR, String(eventId));
  if (fs.existsSync(eventDir)) {
    fs.rmSync(eventDir, { recursive: true });
    return true;
  }
  return false;
};

export { UPLOAD_DIR, PHOTOS_DIR, ORGA_DIR, EVENTS_DIR };

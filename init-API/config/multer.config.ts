import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
export const PHOTOS_DIR = path.join(UPLOAD_DIR, 'photos');
export const ORGA_DIR = path.join(UPLOAD_DIR, 'orga');
export const EVENTS_DIR = path.join(UPLOAD_DIR, 'events');

export function resolveUploadPath(filePath: string): string {
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
  destination: (req, _file, cb) => {
    const userId = req.user?.id;
    if (!userId) {
      return cb(new Error('User ID required'), '');
    }

    const userDir = path.join(PHOTOS_DIR, String(userId));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé. Types acceptés: ${ALLOWED_MIME_TYPES.join(', ')}`));
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

export const stripExif = async (filePath: string): Promise<void> => {
  const fullPath = resolveUploadPath(filePath);
  try {
    const buffer = await sharp(fullPath).rotate().toBuffer();
    await sharp(buffer).toFile(fullPath);
  } catch {
    throw new Error('Le fichier n\'est pas une image valide');
  }
};

export const getPhotoUrl = (userId: number, filename: string): string => {
  return `/uploads/photos/${userId}/${filename}`;
};

export const getPhotoPath = (userId: number, filename: string): string => {
  return path.join(PHOTOS_DIR, String(userId), filename);
};

export const deletePhotoFile = (filePath: string): boolean => {
  const fullPath = resolveUploadPath(filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
};

const orgaLogoStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const orgaId = req.user?.id;
    if (!orgaId) {
      return cb(new Error('Orga ID required'), '');
    }

    const orgaDir = path.join(ORGA_DIR, String(orgaId));
    if (!fs.existsSync(orgaDir)) {
      fs.mkdirSync(orgaDir, { recursive: true });
    }

    cb(null, orgaDir);
  },
  filename: (_req, file, cb) => {
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

export const getOrgaLogoUrl = (orgaId: number, filename: string): string => {
  return `/uploads/orga/${orgaId}/${filename}`;
};

export const deleteOrgaLogo = (orgaId: number): boolean => {
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
  destination: (req, _file, cb) => {
    const eventId = req.params.id;
    if (!eventId) {
      return cb(new Error('Event ID required'), '');
    }

    const eventDir = path.join(EVENTS_DIR, String(eventId));
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }

    cb(null, eventDir);
  },
  filename: (_req, file, cb) => {
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

export const getEventBannerUrl = (eventId: number, filename: string): string => {
  return `/uploads/events/${eventId}/${filename}`;
};

export const deleteEventBanner = (eventId: number): boolean => {
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

export const deleteUserPhotosDir = (userId: number): boolean => {
  const userDir = path.join(PHOTOS_DIR, String(userId));
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true });
    return true;
  }
  return false;
};

export const deleteOrgaDir = (orgaId: number): boolean => {
  const orgaDir = path.join(ORGA_DIR, String(orgaId));
  if (fs.existsSync(orgaDir)) {
    fs.rmSync(orgaDir, { recursive: true });
    return true;
  }
  return false;
};

export const deleteEventDir = (eventId: number): boolean => {
  const eventDir = path.join(EVENTS_DIR, String(eventId));
  if (fs.existsSync(eventDir)) {
    fs.rmSync(eventDir, { recursive: true });
    return true;
  }
  return false;
};

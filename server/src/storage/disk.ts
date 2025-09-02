import fs from 'fs';
import path from 'path';
import multer from 'multer';
import type { Request } from 'express';
import { randomBytes } from 'crypto';
import { extFromMime, guessKind, parseCSV } from '../utils/validate.js';
import type { MediaItem } from '../types.js';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const DB_PATH = path.join(UPLOAD_DIR, 'db.json');

// Small, stable ID generator (hex)
function genId(bytes = 8) {
  return randomBytes(bytes).toString('hex'); // 8 bytes => 16 hex chars
}

//Structural type for the file object we persist
type UploadedFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

type DBShape = { items: MediaItem[] };

//Multer disk callback type
type DiskCb = (error: Error | null, value: string) => void;

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ items: [] }, null, 2));
}

function readDB(): DBShape {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

function writeDB(db: DBShape) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

export function addItem(item: MediaItem) {
  const db = readDB();
  db.items.unshift(item);
  writeDB(db);
  return item;
}

export function deleteItem(id: string) {
  const db = readDB();
  const idx = db.items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  const [deleted] = db.items.splice(idx, 1);
  writeDB(db);
  const filePath = path.join(UPLOAD_DIR, deleted.filename);
  try { fs.unlinkSync(filePath); } catch {}
  return deleted;
}

export function listItems(opts: { cursor?: string; limit?: number; kind?: 'image' | 'video' | undefined }) {
  const { cursor, limit = 50, kind } = opts;
  const db = readDB();
  let items = db.items;
  if (kind) items = items.filter(i => i.kind === kind);

  let start = 0;
  if (cursor) {
    const idx = items.findIndex(i => i.id === cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const slice = items.slice(start, start + limit);
  const nextCursor = (start + limit) < items.length ? slice[slice.length - 1]?.id : null;
  return { items: slice, nextCursor };
}

export function findItem(id: string) {
  const db = readDB();
  return db.items.find(i => i.id === id) || null;
}

// Build allowlists from env
const allowedImages = new Set(
  parseCSV(process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp,image/heic')
);
const allowedVideos = new Set(
  parseCSV(process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm,video/quicktime')
);

// Heuristic fix for Latin-1 “mojibake” seen in supertest uploads on Windows
function normalizeOriginalName(name: string): string {
  // If it contains typical mojibake markers, try latin1 -> utf8
  if (/[ÃÂÐÑ]/.test(name)) {
    try {
      return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
      return name;
    }
  }
  return name;
}

//Multer instance for disk storage (no fileFilter -> always reaches our validator)
export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req: Request, _file: { mimetype: string; originalname: string }, cb: DiskCb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req: Request, file: { mimetype: string; originalname: string }, cb: DiskCb) => {
      const ext = extFromMime(file.mimetype) || path.extname(file.originalname) || '';
      cb(null, genId(8) + ext);
    },
  }),
  limits: {
    // Top-end limit; we also do per-kind checks below
    fileSize: Math.max(
      (parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10) * 1024 * 1024),
      (parseInt(process.env.MAX_VIDEO_SIZE_MB || '200', 10) * 1024 * 1024)
    ),
    files: 20,
  }
});

/**
 * Validate & register a just-written file to our simple JSON "database".
 * If invalid, remove from disk and throw a 400, which the route catches and reports as { ok:false }.
 */
export function registerFileToDB(file: UploadedFile): MediaItem {
  const kind = guessKind(file.mimetype);
  if (!kind) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, file.filename)); } catch {}
    throw Object.assign(new Error('Unsupported file type'), { status: 400 });
  }

  //Enforce allowlists
  if (kind === 'image' && !allowedImages.has(file.mimetype)) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, file.filename)); } catch {}
    throw Object.assign(new Error('Unsupported file type: ' + file.mimetype), { status: 400 });
  }
  if (kind === 'video' && !allowedVideos.has(file.mimetype)) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, file.filename)); } catch {}
    throw Object.assign(new Error('Unsupported file type: ' + file.mimetype), { status: 400 });
  }

  //Per-kind size checks (multer already enforced a top-end max)
  const maxImg = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10) * 1024 * 1024;
  const maxVid = parseInt(process.env.MAX_VIDEO_SIZE_MB || '200', 10) * 1024 * 1024;

  if (kind === 'image' && file.size > maxImg) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, file.filename)); } catch {}
    throw Object.assign(new Error('Image too large'), { status: 400 });
  }
  if (kind === 'video' && file.size > maxVid) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, file.filename)); } catch {}
    throw Object.assign(new Error('Video too large'), { status: 400 });
  }

  const item: MediaItem = {
    id: genId(8),
    filename: file.filename,
    originalName: normalizeOriginalName(file.originalname),
    mime: file.mimetype,
    kind,
    size: file.size,
    createdAt: new Date().toISOString(),
  };

  addItem(item);
  return item;
}
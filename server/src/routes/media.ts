import express from 'express';
import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import {
  upload,
  registerFileToDB,
  listItems,
  deleteItem,
  findItem,
  UPLOAD_DIR,
} from '../storage/disk.js';
import { getAllDisplayNames, setDisplayName } from '../storage/names.js';
import { writeRateLimiter } from '../middleware/rateLimit.js';

export const mediaRouter = express.Router();

type UploadedFileShape = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};


/*  POST /api/media/upload Accepts multipart/form-data with a field named "files".
  - Multer (configured in storage/disk.ts) performs validation for type and size.
  - For each accepted file we register it in our simple on-disk index. */

mediaRouter.post(
  '/upload',
  writeRateLimiter(),
  upload.array('files', 20),
  (request: Request, response: Response) => {
    const filesArray = Array.isArray((request as any).files)
      ? ((request as any).files as UploadedFileShape[])
      : [];

    const results: Array<{ ok: true; item: any } | { ok: false; error: string }> = [];

    for (const file of filesArray) {
      try {
        const item = registerFileToDB(file);
        results.push({ ok: true, item });
      } catch (error: any) {
        results.push({ ok: false, error: error?.message || 'Upload failed' });
      }
    }

    response.json({ results });
  }
);

/* GET /api/media Lists media with optional filtering and cursor pagination.
  Also merges user-defined display names from names.json. */
mediaRouter.get('/', (request: Request, response: Response) => {
  const defaultPageSize = Number(process.env.API_PAGE_SIZE_DEFAULT ?? 24);
  const maximumPageSize = Number(process.env.API_PAGE_SIZE_MAX ?? 60);

  const rawLimit = typeof request.query.limit === 'string' ? request.query.limit : '';
  const requestedPageSize = Number.parseInt(rawLimit, 10);
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(Math.max(requestedPageSize, 1), maximumPageSize)
    : defaultPageSize;

  const cursor =
    typeof request.query.cursor === 'string' && request.query.cursor.length > 0
      ? request.query.cursor
      : undefined;

  const rawKind = typeof request.query.kind === 'string' ? request.query.kind : undefined;
  const kind: 'image' | 'video' | undefined =
    rawKind === 'image' || rawKind === 'video' ? rawKind : undefined;

  const { items, nextCursor } = listItems({
    cursor,
    limit: pageSize,
    kind,
  });

  const names = getAllDisplayNames();

  const itemsWithExtras = items.map((item) => ({
    ...item,
    url: '/uploads/' + item.filename,
    displayName: names[item.id],
  }));

  response.json({ items: itemsWithExtras, nextCursor });
});

/* PATCH /api/media/:id  Update/clear the user-visible display name for a media item.*/
mediaRouter.patch('/:id', writeRateLimiter(), (request: Request, response: Response) => {
  const mediaId = request.params.id;
  const existing = findItem(mediaId);
  if (!existing) {
    return response.status(404).json({ error: 'Not found' });
  }

  const newName = typeof request.body?.displayName === 'string' ? request.body.displayName : '';
  const stored = setDisplayName(mediaId, newName);

  response.json({
    ok: true,
    item: {
      ...existing,
      url: '/uploads/' + existing.filename,
      displayName: stored,
    },
  });
});

mediaRouter.delete('/:id', writeRateLimiter(), (request: Request, response: Response) => {
  const mediaId = request.params.id;
  const deleted = deleteItem(mediaId);
  if (!deleted) {
    return response.status(404).json({ error: 'Not found' });
  }
  response.json({ ok: true, deleted });
});

/* GET /api/media/:id/stream Streams a file with HTTP Range support.*/
mediaRouter.get('/:id/stream', (request: Request, response: Response) => {
  const mediaId = request.params.id;
  const item = findItem(mediaId);
  if (!item) {
    return response.status(404).end();
  }

  const filePath = path.join(UPLOAD_DIR, item.filename);

  let fileStats: fs.Stats;
  try {
    fileStats = fs.statSync(filePath);
  } catch {
    return response.status(404).end();
  }

  const rangeHeader = request.headers.range;
  response.setHeader('Content-Type', item.mime);
  response.setHeader('Accept-Ranges', 'bytes');

  if (!rangeHeader) {
    response.setHeader('Content-Length', fileStats.size);
    fs.createReadStream(filePath).pipe(response);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) {
    response.status(416).setHeader('Content-Range', `bytes */${fileStats.size}`).end();
    return;
  }

  const startString = match[1];
  const endString = match[2];

  const startByte = startString ? parseInt(startString, 10) : 0;
  const endByte = endString ? parseInt(endString, 10) : fileStats.size - 1;

  const invalidRange =
    Number.isNaN(startByte) ||
    Number.isNaN(endByte) ||
    startByte < 0 ||
    endByte < startByte ||
    endByte >= fileStats.size;

  if (invalidRange) {
    response.status(416).setHeader('Content-Range', `bytes */${fileStats.size}`).end();
    return;
  }

  const chunkSize = endByte - startByte + 1;
  response.status(206);
  response.setHeader('Content-Range', `bytes ${startByte}-${endByte}/${fileStats.size}`);
  response.setHeader('Content-Length', chunkSize);
  fs.createReadStream(filePath, { start: startByte, end: endByte }).pipe(response);
});

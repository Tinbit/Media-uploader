
import mime from 'mime-types';
import type { MediaKind } from '../types.js';

export function extFromMime(mimeType: string) {
  const ext = mime.extension(mimeType);
  return ext ? '.' + ext : '';
}

export function guessKind(mimeType: string): MediaKind | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return null;
}

export function parseCSV(input: string | undefined): string[] {
  if (!input) return [];
  return input.split(',').map(s => s.trim()).filter(Boolean);
}

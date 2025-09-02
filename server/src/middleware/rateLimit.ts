/* 
import rateLimit from 'express-rate-limit';

export function createRateLimiter() {
  const windowMin = parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '15', 10);
  const max = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
  return rateLimit({
    windowMs: windowMin * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
 */
import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MIN ?? 15)
const maxRequests = Number(process.env.RATE_LIMIT_MAX ?? 100)

/**
 * Applies rate limiting to write/modify routes.
 * Skips GET/HEAD/OPTIONS so listing and static reads never 429.
 */
export function writeRateLimiter() {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) =>
      (req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown').toString(),
    skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
    message: { error: 'Too many requests. Please slow down.' },
  })
}

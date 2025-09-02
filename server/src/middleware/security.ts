
import helmet from 'helmet';
import type { Express } from 'express';

export function setupSecurity(app: Express) {
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "img-src": ["'self'", "data:", "blob:"],
        "media-src": ["'self'", "data:", "blob:"],
        "connect-src": ["'self'"],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
  }));
}

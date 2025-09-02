import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

import { setupSecurity } from './middleware/security.js'
import { errorHandler } from './middleware/errorHandler.js'
import { ensureUploadDir, UPLOAD_DIR } from './storage/disk.js'
import { mediaRouter } from './routes/media.js'

dotenv.config()
ensureUploadDir()

const app = express()

setupSecurity(app)
app.use(express.json({ limit: '1mb' }))
app.use(morgan('tiny'))

//CORS (dev: allow Vite)
const origin = process.env.CLIENT_ORIGIN || undefined
app.use(cors({ origin, credentials: true }))

//serve uploaded files with mild caching, safe headers
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    fallthrough: false,
    setHeaders: (res, filePath) => {
      const isMedia = /\.(mp4|webm|mov|jpg|jpeg|png|gif|webp|heic)$/i.test(filePath)
      res.setHeader('Cache-Control', isMedia ? 'public, max-age=604800, immutable' : 'no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Content-Disposition', 'inline')
    },
  })
)

//checks server process up & Express is able to handle a request
app.get('/api/health', (_req, res) => res.json({ ok: true }))

//api routes
app.use('/api/media', mediaRouter)

//Serve client build in prod,from server/ to repo root
const ROOT_DIR = path.resolve(process.cwd(), '..');
const clientDist = path.join(ROOT_DIR, 'client', 'dist');

if (fs.existsSync(clientDist) && process.env.SERVE_CLIENT !== 'false') {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler)

export default app

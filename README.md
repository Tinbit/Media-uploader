# Media Uploader (Node + React)

A polished **Node.js + React** media uploader: drag & drop with live progress, type filters, rename/delete, a paginated gallery, and video streaming. **Dockerized** for one-command local runs, with **GitHub Actions CI** running tests and builds on every branch/PR. Built end-to-end in **TypeScript** (Node.js/Express API + React/Vite/MUI), using local disk storage now, but the design makes it easy to swap to **S3/CDN** later.


## What’s included
- **Node Express + TypeScript backend**
- **React + Vite + TypeScript frontend**
- **Upload progress UI**, drag & drop, and previews (images & videos)
- **File validation** (type/size), **Unicode filenames** (Cyrillic/Chinese/etc.), security headers & basic write-rate limiting
- **Tests** — Server: **Jest + Supertest**; Client: **Vitest + React Testing Library**
- **Dockerized** Build and run with Docker Desktop
- **Continuous Integration (GitHub Actions)**, The repo runs CI on every branch and on pull requests
   ![CI](https://github.com/Tinbit/Media-uploader/actions/workflows/ci.yml/badge.svg)

### In addition
- **Filter by type:** All / Images / Videos
- **Responsive UI:** 1 / 2 / 3 / 4-column grid based on screen size; mobile tap targets ≥ 40px
- **Accessible uploads:** screen-reader live announcements (progress/complete/error)
- **Rename & delete:** inline display-name edit; delete with toast feedback
- **Video streaming:** HTTP Range (seekable playback)
- **Pagination:** cursor-based, server-side (page size adapts to screen size)
- **Validation & safety:** MIME allowlists, size limits, random filenames, Unicode-safe names
- **DX:** watch mode for both apps, ESM TypeScript on server, clear project structure

---

## Get Started

### Install
```bash
npm install
```
### Set environment
Create server/.env
```bash
PORT=4000
UPLOAD_DIR=uploads
CLIENT_ORIGIN=http://localhost:5173
MAX_IMAGE_SIZE_MB=10
MAX_VIDEO_SIZE_MB=200
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp,image/heic
ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/quicktime
RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX=100
SERVE_CLIENT=true
API_PAGE_SIZE_DEFAULT=24
API_PAGE_SIZE_MAX=60
```
### Run in development (watch: client + server)
```bash
  npm run dev
```
Client: http://localhost:5173
API: http://localhost:4000

### Production build & run
```bash
npm -w client run build
npm -w server run build

# start server (serves API; if SERVE_CLIENT=true in server/.env, it also serves client/dist)
npm start
```
Create server/.env before running (see Set environment configuration section as an example value).

## Tests
- **Server**: `npm -w server test`
- **Client**: `npm -w client test`

---

## Run with Docker (local)

Build and run with Docker Desktop:

```bash
docker compose build
docker compose up
# http://localhost:4000


## Scope adjustment note
“This could’ve been made better by ensuring resumable uploads, cloud object storage with signed URLs, content moderation/AV scanning, and a proper DB with migrations. It would take a few days more to implement and at this point I don’t see the value for the demo scope — but I’d plan those next for a production rollout.”
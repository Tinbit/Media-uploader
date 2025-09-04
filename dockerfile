FROM node:20-bullseye AS builder
WORKDIR /app
ENV CI=true

# leverage Docker layer caching
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all workspace dependencies
RUN npm ci

COPY client ./client
COPY server ./server

RUN npm -w client run build
RUN npm -w server run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server/package*.json ./server/

RUN npm ci --omit=dev

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Ensuring uploads dir exists
RUN mkdir -p /app/server/uploads

ENV PORT=4000 \
    SERVE_CLIENT=true \
    UPLOAD_DIR=uploads

EXPOSE 4000

# Runing the server (ESM, compiled JS)
WORKDIR /app/server
CMD ["node", "dist/index.js"]
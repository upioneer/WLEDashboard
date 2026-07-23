# ─── Stage 1: Build frontend ────────────────────────────────────────────────
FROM node:22-alpine AS web-builder

WORKDIR /build

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/

RUN npm ci --workspace=apps/web --ignore-scripts

COPY apps/web ./apps/web

RUN npm run build --workspace=apps/web

# ─── Stage 2: Production API ─────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install API dependencies
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/

RUN npm ci --workspace=apps/api --ignore-scripts --omit=dev

# Copy API source
COPY apps/api ./apps/api

# Copy built frontend into the API's static directory
COPY --from=web-builder /build/apps/web/dist ./apps/web/dist

# Data directory (mount a volume here for persistence)
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATA_DIR=/data

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

EXPOSE 3001

CMD ["node", "apps/api/src/server.js"]

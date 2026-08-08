FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for better-sqlite3 build just in case prebuilt binaries are missing
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/

RUN npm install

COPY . .

RUN npm run build --workspace=apps/web

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Create data directory
RUN mkdir -p /app/data

# Only copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3001

CMD ["node", "apps/api/src/server.js"]

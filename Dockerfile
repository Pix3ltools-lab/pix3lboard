FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p public && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# Create blob storage directory and set ownership before switching to non-root user.
# The node user (uid 1000) needs write access to /data/blob-storage when
# STORAGE_PROVIDER=local. New Docker named volumes inherit this ownership.
# Existing volumes owned by root require a one-time fix:
#   docker run --rm -v <project>_blob-storage:/data alpine chown -R 1000:1000 /data
RUN mkdir -p /data/blob-storage && chown -R node:node /app /data/blob-storage
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD wget -qO- http://localhost:3000 > /dev/null || exit 1
CMD ["npx", "next", "start"]

FROM node:22-alpine AS monitoring-builder
WORKDIR /repo/packages/monitoring
COPY packages/monitoring/package.json packages/monitoring/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY packages/monitoring/ ./
RUN npm run build

FROM node:22-alpine AS emails-builder
WORKDIR /repo/apps/emails
COPY apps/emails/package.json apps/emails/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY apps/emails/ ./
RUN npm run build

FROM node:22-alpine AS builder
WORKDIR /repo/apps/workers
COPY --from=monitoring-builder /repo/packages/monitoring /repo/packages/monitoring
COPY --from=emails-builder /repo/apps/emails /repo/apps/emails
COPY apps/workers/package.json apps/workers/package-lock.json* ./
RUN npm ci
COPY apps/workers/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /repo/apps/workers
ENV NODE_ENV=production

# Install ffmpeg, python3 + pip (required by yt-dlp), then yt-dlp with full extras
RUN apk add --no-cache ffmpeg python3 py3-pip \
  && pip3 install --break-system-packages --no-cache-dir 'yt-dlp[default]'

COPY --from=monitoring-builder /repo/packages/monitoring /repo/packages/monitoring
COPY --from=emails-builder /repo/apps/emails /repo/apps/emails
COPY apps/workers/package.json apps/workers/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /repo/apps/workers/dist ./dist
COPY apps/workers/newrelic.js ./newrelic.js
CMD ["node", "-r", "newrelic", "dist/main.js"]

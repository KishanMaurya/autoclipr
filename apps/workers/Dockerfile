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

# yt-dlp version.
#
# Bump this to force a fresh install. Because the value is referenced in the
# RUN below, changing it invalidates that layer — which is the whole point:
# an unpinned install still gets cached, so the binary ends up only as fresh
# as the last time some *earlier* layer happened to change. YouTube alters its
# bot detection constantly and yt-dlp ships fixes weekly, so a months-stale
# binary presents exactly like an IP block: every player client fails while
# the proxy is demonstrably fine.
#
# "latest" installs the newest release. Pin an exact version (e.g. 2026.8.20)
# to make upgrades deliberate.
ARG YTDLP_VERSION=latest

# Install ffmpeg, python3 + pip (required by yt-dlp), then yt-dlp with full extras
RUN apk add --no-cache ffmpeg python3 py3-pip \
  && if [ "$YTDLP_VERSION" = "latest" ]; then \
       pip3 install --break-system-packages --no-cache-dir --upgrade 'yt-dlp[default]'; \
     else \
       pip3 install --break-system-packages --no-cache-dir "yt-dlp[default]==${YTDLP_VERSION}"; \
     fi \
  && yt-dlp --version

COPY --from=monitoring-builder --chown=node:node /repo/packages/monitoring /repo/packages/monitoring
COPY --from=emails-builder --chown=node:node /repo/apps/emails /repo/apps/emails
COPY --chown=node:node apps/workers/package.json apps/workers/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder --chown=node:node /repo/apps/workers/dist ./dist
COPY --chown=node:node apps/workers/newrelic.js ./newrelic.js
USER node
CMD ["node", "-r", "newrelic", "dist/main.js"]

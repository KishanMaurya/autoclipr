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
WORKDIR /repo/apps/api
COPY --from=monitoring-builder /repo/packages/monitoring /repo/packages/monitoring
COPY --from=emails-builder /repo/apps/emails /repo/apps/emails
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm ci
COPY apps/api/ ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /repo/apps/api
ENV NODE_ENV=production
COPY --from=monitoring-builder /repo/packages/monitoring /repo/packages/monitoring
COPY --from=emails-builder /repo/apps/emails /repo/apps/emails
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /repo/apps/api/dist ./dist
COPY apps/api/newrelic.js ./newrelic.js
EXPOSE 8080
CMD ["node", "-r", "newrelic", "dist/main.js"]

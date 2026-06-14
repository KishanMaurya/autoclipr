# New Relic — AutoClipr

Observability for **AutoClipr API** (Railway) and **AutoClipr Workers** (Railway) using the [New Relic Free Tier](https://newrelic.com/pricing/free-tier).

## Architecture

| Service | `NEW_RELIC_APP_NAME` | Code |
|---------|----------------------|------|
| NestJS API | `AutoClipr API` | `apps/api` |
| BullMQ workers | `AutoClipr Workers` | `apps/workers` |
| Shared library | — | `packages/monitoring` |

**Not instrumented (by design):** ffmpeg step logs, yt-dlp retries, PipelineLogger debug output, HTTP bodies.

## Setup

### 1. New Relic account

1. Create a free account at [newrelic.com](https://newrelic.com)
2. **Admin → API keys** → copy **License key**

### 2. Railway variables

**API service:**

```env
NEW_RELIC_LICENSE_KEY=<your-key>
NEW_RELIC_APP_NAME=AutoClipr API
NEW_RELIC_LOG_LEVEL=info
```

**Workers service:**

```env
NEW_RELIC_LICENSE_KEY=<your-key>
NEW_RELIC_APP_NAME=AutoClipr Workers
NEW_RELIC_LOG_LEVEL=info
```

### 3. Docker build context (important)

Dockerfiles copy `packages/monitoring`. Set Railway **Root Directory** to the **repository root** (not `apps/api`):

| Service | Root Directory | Dockerfile path |
|---------|----------------|-----------------|
| API | `.` (repo root) | `apps/api/Dockerfile` |
| Workers | `.` (repo root) | `apps/workers/Dockerfile` |

Redeploy both services after saving variables.

### 4. Verify

- New Relic → **APM & Services** → see `AutoClipr API` and `AutoClipr Workers`
- Upload a video → **Query your data** → custom events `VideoUploadStarted`, `VideoProcessingStarted`, etc.

## Custom events

| Event | When |
|-------|------|
| `VideoUploadStarted` | File upload init (`POST /videos/upload`) |
| `VideoProcessingStarted` | Job enqueued to BullMQ |
| `VideoProcessingCompleted` | Pipeline finished successfully |
| `VideoProcessingFailed` | Worker job failed |
| `HookGenerated` | AI hook analysis completed |

## Custom metrics

| Metric | Source |
|--------|--------|
| `Custom/AutoClipr/Queue/Depth` | Workers — waiting + active + delayed |
| `Custom/AutoClipr/Queue/Failed` | Workers — failed job count |
| `Custom/AutoClipr/Queue/Active` | Workers — active jobs |
| `Custom/AutoClipr/Job/DurationMs` | Workers — per completed job |

## Distributed tracing

API enqueues BullMQ jobs with W3C trace headers (`_nrTrace` in job payload). Workers accept headers inside `withBackgroundTransaction` so API requests link to background jobs in New Relic.

## Dashboards (create in NR UI)

Use **Dashboards → Create a dashboard** and add charts with these NRQL queries.

### Business dashboard

```sql
SELECT count(*) FROM VideoUploadStarted TIMESERIES
```

```sql
SELECT count(*) FROM VideoProcessingCompleted TIMESERIES
```

```sql
SELECT percentage(count(*), WHERE error IS NULL) AS 'Success rate'
FROM VideoProcessingCompleted, VideoProcessingFailed
```

```sql
SELECT average(processingTime) FROM VideoProcessingCompleted TIMESERIES
```

```sql
SELECT count(*) FROM HookGenerated FACET provider
```

### Processing dashboard

```sql
SELECT average(Custom/AutoClipr/Queue/Depth) FROM Metric TIMESERIES
```

```sql
SELECT max(Custom/AutoClipr/Queue/Depth) FROM Metric TIMESERIES
```

```sql
SELECT count(*) FROM VideoProcessingFailed TIMESERIES
```

```sql
SELECT average(latency) FROM HookGenerated TIMESERIES
```

```sql
SELECT count(*) FROM Log WHERE message LIKE '%ffmpeg failed%' TIMESERIES
```

### Infrastructure dashboard (Railway containers)

```sql
SELECT average(apm.service.cpu.usertime.utilization) AS 'CPU %'
FROM Metric WHERE appName IN ('AutoClipr API', 'AutoClipr Workers') TIMESERIES
```

```sql
SELECT average(apm.service.memory.physical) FROM Metric
WHERE appName IN ('AutoClipr API', 'AutoClipr Workers') TIMESERIES
```

```sql
SELECT percentile(duration, 95) FROM Transaction WHERE appName = 'AutoClipr API' TIMESERIES
```

```sql
SELECT percentage(count(*), WHERE error IS true) AS 'Error rate %'
FROM Transaction WHERE appName = 'AutoClipr API' TIMESERIES
```

```sql
SELECT average(databaseDuration) FROM Transaction WHERE appName = 'AutoClipr API' TIMESERIES
```

## Alerts (Alerts → Alert conditions)

Create **NRQL alert conditions**:

| Alert | NRQL | Threshold |
|-------|------|-----------|
| API error rate | `SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = 'AutoClipr API'` | > 5% for 5 min |
| API latency p95 | `SELECT percentile(duration, 95) FROM Transaction WHERE appName = 'AutoClipr API'` | > 2 seconds for 5 min |
| Queue depth | `SELECT max(Custom/AutoClipr/Queue/Depth) FROM Metric` | > 100 for 5 min |
| Processing failures | `SELECT count(*) FROM VideoProcessingFailed` | > 10 in 15 min |
| Memory | `SELECT average(apm.service.memory.physical) FROM Metric WHERE appName = 'AutoClipr Workers'` | > 80% of container limit |
| CPU | `SELECT average(apm.service.cpu.usertime.utilization) FROM Metric` | > 80% for 5 min |

Adjust thresholds after baseline week of traffic.

## Phase 2 (not implemented)

- `SubscriptionCreated` custom event (requires Stripe webhooks)
- Stripe webhook failure alerts
- Browser agent on Vercel (`apps/web`)

## Local development

Without `NEW_RELIC_LICENSE_KEY`, monitoring is a **no-op** — structured JSON logs still print for errors/warnings/business events.

```powershell
cd packages/monitoring && npm install && npm run build
cd ../../apps/api && npm install && npm run start:dev
```

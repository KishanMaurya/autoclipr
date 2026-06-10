# AutoClipr

Modern AI video clipping SaaS — turn long-form videos into viral short clips with subtitles, exports, and subscription-based credits.

**Domains:** [autoclipr.ai](https://autoclipr.ai) · [autoclipr.io](https://autoclipr.io) · [autoclipr.com](https://autoclipr.com)

## Monorepo structure

```
autoclipr/
├── apps/
│   ├── web/       # Next.js 15 (App Router) + ShadCN UI
│   ├── api/       # NestJS REST API (Clean Architecture)
│   └── workers/   # NestJS + BullMQ background processors
├── supabase/
├── docker-compose.yml
└── .env.example
```

## Prerequisites

- **Node.js** 20+
- **Redis** (for BullMQ job queue)
- **Docker** & Docker Compose (optional)
- **Supabase** project

## Quick start

### 1. Environment

```bash
cp .env.example .env
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_youtube_channels.sql` (or `RUN_youtube_channels.sql`)
   - `supabase/migrations/003_video_url_import.sql`
3. Enable **Google** under Authentication → Providers.
4. Create storage buckets: `videos`, `clips`, `exports`.

### 3. API (NestJS)

```bash
cd apps/api
npm install
npm run start:dev
# http://localhost:8080/health
```

### 4. Workers (NestJS + BullMQ)

```bash
cd apps/workers
npm install
npm run start:dev
```

Requires **Redis 6.2+** (BullMQ). Legacy Windows Redis **5.0.x** causes warnings.

**Option A — Docker** (start Docker Desktop first):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-redis.ps1
```

**Option B — Replace old Redis** (PowerShell **as Administrator**):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fix-redis-admin.ps1
```

Then set `REDIS_URL=redis://localhost:6379` and restart API + workers.

**Media pipeline (URL → shorts):** workers call **yt-dlp**, **FFmpeg**, **OpenAI Whisper** (transcription), and **DeepSeek or OpenAI** (viral hook analysis). Configure in root `.env`:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Whisper speech-to-text (required for real captions) |
| `LLM_PROVIDER=deepseek` | Use DeepSeek for hook analysis (~10× cheaper) |
| `DEEPSEEK_API_KEY` | DeepSeek API key from [platform.deepseek.com](https://platform.deepseek.com) |

| Tool | Windows install |
|------|-----------------|
| FFmpeg | `winget install Gyan.FFmpeg` or [ffmpeg.org](https://ffmpeg.org) |
| yt-dlp | `winget install yt-dlp.yt-dlp` or `pip install yt-dlp` |

Verify: `ffmpeg -version` and `yt-dlp --version`.

Pipeline flow:

```
Paste URL → yt-dlp download → FFmpeg extract audio → Whisper transcript
→ DeepSeek/OpenAI viral moments → FFmpeg cut 9:16 clips → burn SRT captions → Supabase Storage
```

### 5. Web (Next.js)

```bash
cd apps/web
npm install
npm run dev
# http://localhost:3000
```

### 6. Docker

```bash
docker compose up --build
```

## NestJS API architecture

```
apps/api/src/
├── config/
├── common/          # guards, filters, decorators
├── database/
├── health/
└── modules/
    ├── auth/
    ├── users/
    ├── videos/
    ├── clips/
    ├── billing/
    ├── jobs/        # BullMQ enqueue
    └── storage/
```

Each module: `controller` → `service` → `repository` (same REST contract as before).

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/auth/sync` | Sync profile after Supabase login |
| GET | `/api/v1/users/me` | Current user + credits |
| POST | `/api/v1/videos/upload` | Initiate upload |
| POST | `/api/v1/videos/import-url` | Import from YouTube/Vimeo/etc. |
| GET | `/api/v1/videos/:id/pipeline` | Pipeline progress |
| GET | `/api/v1/videos` | List videos |
| POST | `/api/v1/clips/generate` | Enqueue AI clip job |
| GET | `/api/v1/clips` | List clips |
| POST | `/api/v1/clips/:id/export` | Export clip |
| GET | `/api/v1/billing/subscription` | Subscription status |
| GET | `/api/v1/plans` | Pricing plans |

## Production checklist

- [ ] Set `SUPABASE_JWT_SECRET` and service role key
- [ ] Run Redis in production for BullMQ
- [x] URL pipeline in `apps/workers` (yt-dlp + FFmpeg + Whisper + GPT)
- [ ] Tune GPT prompts / caption styles per platform
- [ ] Auto-publish to connected social accounts
- [ ] Add Stripe webhooks for billing

## License

Proprietary — AutoClipr © 2026

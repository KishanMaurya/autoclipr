# Railway deployment — AutoClipr

Deploy **API**, **workers**, and **Redis** on [Railway](https://railway.com).  
Web on **Vercel** (`apps/web`) — see [DEPLOY.md](./DEPLOY.md).

**One GitHub repo** — three Railway services + Vercel, each with a different **Root Directory**.

---

## Your project references (from `.env`)

| Item | Value |
|------|--------|
| Supabase project | `mkwbdscwxpisrazqegtw` |
| Supabase URL | `https://mkwbdscwxpisrazqegtw.supabase.co` |
| DB (pooler) | `aws-1-ap-southeast-1.pooler.supabase.com:5432` |
| Local Redis | `redis://localhost:6380` |
| LLM | `deepseek` / `deepseek-v4-flash` |
| Whisper | `whisper-1` |
| Queue | `clip_processing` |
| Buckets | `videos`, `clips`, `exports` |
| Domains (CORS) | `autoclipr.com`, `autoclipr.ai`, `autoclipr.io` |

Paste **secrets** from your local `.env` into Railway — do not commit them.

---

## Railway project layout

```
Railway: autoclipr
├── Redis
├── api       (Root: apps/api)
└── workers   (Root: apps/workers)
```

Plan: **Hobby ($5/mo)** to start.

---

## Step 1 — Create project

1. [railway.com](https://railway.com) → **GitHub** sign-in  
2. **New Project** → **Deploy from GitHub repo** → `autoclipr`

---

## Step 2 — Redis

1. **+ New** → **Database** → **Redis**  
2. When active, note service name (usually `Redis`)  
3. API + workers will use: `REDIS_URL=${{Redis.REDIS_URL}}`

---

## Step 3 — API service

### Settings

| Setting | Value |
|---------|--------|
| Root Directory | `.` (repo root — **not** `apps/api`) |
| Config file | `apps/api/railway.toml` (or use root `railway.toml`) |
| Builder | **Dockerfile** (from `railway.toml` — not Railpack) |
| Dockerfile path | `apps/api/Dockerfile` |
| Public domain | **Generate Domain** (e.g. `autoclipr-api-production.up.railway.app`) |

> **Important:** If Root Directory is `.` without `railway.toml`, Railway uses **Railpack** and fails with “No start command detected”. Root `railway.toml` forces **Dockerfile** builds.

In Railway → **Service → Settings → Build** confirm **Builder** shows **Dockerfile**, not Railpack/Nixpacks.

### Variables — paste from root `.env` (update URLs marked ⬇)

```env
NODE_ENV=production
LOG_HTTP_BODIES=false
API_HOST=0.0.0.0

# ⬇ After generating Railway domain:
API_PUBLIC_URL=https://autoclipr-api-production.up.railway.app
# ⬇ Where users land after YouTube OAuth (must match Vercel domain):
WEB_APP_URL=https://autoclipr.com
ALLOWED_ORIGINS=https://autoclipr.com,https://www.autoclipr.com,https://autoclipr.ai,https://autoclipr.io,https://YOUR-APP.vercel.app,http://localhost:3000

SUPABASE_URL=https://mkwbdscwxpisrazqegtw.supabase.co
SUPABASE_ANON_KEY=<paste from local .env — not GitHub>
SUPABASE_SERVICE_ROLE_KEY=<paste from local .env — secret>
SUPABASE_JWT_SECRET=<paste from local .env — secret>

DATABASE_URL=<paste pooler URL from local .env — secret>
JWT_SECRET=<paste from local .env — secret>

STORAGE_BUCKET_VIDEOS=videos
STORAGE_BUCKET_CLIPS=clips
STORAGE_BUCKET_EXPORTS=exports

REDIS_URL=${{Redis.REDIS_URL}}
QUEUE_CLIP_PROCESSING=clip_processing

GOOGLE_CLIENT_ID=<paste from local .env>
GOOGLE_CLIENT_SECRET=<paste from local .env — secret>
# ⬇ Must match Google Console + Railway domain:
GOOGLE_REDIRECT_URI=https://autoclipr-api-production.up.railway.app/api/v1/platforms/youtube/callback

# New Relic (optional)
NEW_RELIC_LICENSE_KEY=
NEW_RELIC_APP_NAME=AutoClipr API
NEW_RELIC_LOG_LEVEL=info
```

Railway injects `PORT` automatically — no need to set `API_PORT`.

### Verify

```bash
curl https://autoclipr-api-production.up.railway.app/health
```

---

## Step 4 — Workers service

### Settings

| Setting | Value |
|---------|--------|
| Root Directory | `.` (repo root) |
| Config file | `apps/workers/railway.toml` (**required** — do not use root `railway.toml`) |
| Builder | **Dockerfile** |
| Dockerfile path | `apps/workers/Dockerfile` |
| Public domain | **None** (background worker) |
| Memory | **2 GB+** recommended |

> **Docker build:** Root must be repo root so `packages/monitoring` is available. See [observability/new-relic/README.md](../observability/new-relic/README.md).

### Variables — paste from root `.env`

```env
NODE_ENV=production

SUPABASE_URL=https://mkwbdscwxpisrazqegtw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste from local .env — secret>
DATABASE_URL=<paste pooler URL from local .env — secret>

REDIS_URL=${{Redis.REDIS_URL}}
QUEUE_CLIP_PROCESSING=clip_processing

OPENAI_API_KEY=<paste from local .env — secret>
WHISPER_MODEL=whisper-1
OPENAI_FALLBACK_ON_QUOTA=true

LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=<paste from local .env — secret>
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=gpt-4o

STORAGE_BUCKET_VIDEOS=videos
STORAGE_BUCKET_CLIPS=clips

FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
YTDLP_PATH=yt-dlp
# Optional — fixes YouTube bot check (see Troubleshooting)
# YTDLP_COOKIES_B64=<base64 of Netscape cookies.txt>

# New Relic (optional)
NEW_RELIC_LICENSE_KEY=
NEW_RELIC_APP_NAME=AutoClipr Workers
NEW_RELIC_LOG_LEVEL=info
```

### Verify

Railway → workers → **Logs** → BullMQ worker connected, no Redis errors.

---

## Step 5 — Vercel (web)

Root Directory: `apps/web`

```env
NEXT_PUBLIC_APP_URL=https://autoclipr.com
NEXT_PUBLIC_API_URL=https://autoclipr-api-production.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://mkwbdscwxpisrazqegtw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste from apps/web/.env>
```

Redeploy Vercel after saving variables.

---

## Step 6 — Custom domain `api.autoclipr.com` (optional)

1. Railway → api → **Networking** → **Custom Domain** → `api.autoclipr.com`  
2. GoDaddy → CNAME `api` → Railway hostname  
3. Update everywhere:

```env
API_PUBLIC_URL=https://api.autoclipr.com
NEXT_PUBLIC_API_URL=https://api.autoclipr.com
GOOGLE_REDIRECT_URI=https://api.autoclipr.com/api/v1/platforms/youtube/callback
```

4. Google Console → add production redirect URI  
5. Redeploy API + Vercel

---

## Step 7 — Supabase auth URLs

Project: https://supabase.com/dashboard/project/mkwbdscwxpisrazqegtw

**Authentication → URL configuration:**

- Site URL: `https://autoclipr.com`  
- Redirect URLs: `https://autoclipr.com/**`, `https://*.vercel.app/**`

---

## Step 8 — Google OAuth (production)

[Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth client:

| | Redirect URI |
|--|----------------|
| Local (already in `.env`) | `http://localhost:8080/api/v1/platforms/youtube/callback` |
| Production (add this) | `https://api.autoclipr.com/api/v1/platforms/youtube/callback` |

Must match `GOOGLE_REDIRECT_URI` on Railway API **exactly**.

---

## Env file map (local → Railway)

| Local file | Railway service |
|------------|-----------------|
| Root `.env` → API block | **api** |
| Root `.env` → workers / AI block | **workers** |
| `apps/web/.env` | **Vercel** (not Railway) |
| `REDIS_URL=redis://localhost:6380` | Replace with `${{Redis.REDIS_URL}}` |

API and workers **do not need** their own `.env` files in the repo — Railway vars replace them in production.

---

## Deploy checklist

```
[ ] Redis running on Railway
[ ] API deployed (apps/api) — /health OK
[ ] Workers deployed (apps/workers) — logs OK
[ ] REDIS_URL linked on API + workers
[ ] Vercel NEXT_PUBLIC_API_URL → Railway API URL
[ ] Supabase redirect URLs updated
[ ] Google production redirect URI added
[ ] Test clip job end-to-end
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Healthcheck failed** on deploy | API must bind `0.0.0.0` (not `127.0.0.1`). Workers need `apps/workers/railway.toml` as config file (not root `railway.toml`). Redeploy **without cache**. Check `curl https://api.autoclipr.com/health` for `commit` hash. |
| Delete video 404 after deploy | New API deploy failed — old replica still serves traffic. Fix healthcheck first, then redeploy API + Vercel. |
| API DB connection fails | Use **pooler** `DATABASE_URL` from `.env`, not direct `db.` host |
| CORS error from Vercel | Add `https://your-app.vercel.app` to `ALLOWED_ORIGINS` |
| Clips stuck queued | Workers down or `REDIS_URL` mismatch |
| OAuth redirect error | `GOOGLE_REDIRECT_URI` must match Google Console exactly |
| ffmpeg crash | Workers need Dockerfile builder, 2 GB+ RAM |
| YouTube `Sign in to confirm you're not a bot` | Export browser cookies → set `YTDLP_COOKIES_B64` on **workers** (see below) |

### YouTube bot check (`yt-dlp` blocked on Railway)

YouTube often blocks downloads from cloud/datacenter IPs. The reliable fix is **authenticated cookies**:

1. In Chrome, install **Get cookies.txt LOCALLY** (or similar).
2. Open [youtube.com](https://youtube.com) while signed in → export cookies as `cookies.txt` (Netscape format).
3. Base64-encode the file:
   - **PowerShell:** `[Convert]::ToBase64String([IO.File]::ReadAllBytes("cookies.txt"))`
   - **macOS/Linux:** `base64 -w0 cookies.txt` (or `base64 cookies.txt | tr -d '\n'`)
4. Railway → **workers** → Variables → add `YTDLP_COOKIES_B64` = paste the base64 string (mark as secret).
5. Redeploy workers. Logs should show `YouTube cookies enabled`.

**Workaround for users:** upload the MP4 on `/upload` instead of pasting a YouTube URL.

Cookies expire periodically — re-export and update the variable if downloads start failing again.

---

## Repo files

| File | Purpose |
|------|---------|
| `apps/api/railway.toml` | API healthcheck + Docker |
| `apps/workers/railway.toml` | Workers Docker |
| `apps/api/Dockerfile` | NestJS API image |
| `apps/workers/Dockerfile` | ffmpeg + yt-dlp image |
| `.env` | Local secrets (gitignored) |
| `apps/web/.env` | Local web public vars |
| `DEPLOY.md` | Full stack guide |

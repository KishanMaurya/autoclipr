# AutoClipr deployment guide

**One GitHub repo** → three deployments:

| Folder | Host |
|--------|------|
| `apps/web` | **Vercel** |
| `apps/api` | **Railway** |
| `apps/workers` | **Railway** |

Plus **Railway Redis** and **Supabase** (`mkwbdscwxpisrazqegtw`).

**Railway click-by-click:** [RAILWAY.md](./RAILWAY.md)

**Never commit `.env` to GitHub.** Copy values into each host’s dashboard.

**Never put real API keys, passwords, or secrets in `DEPLOY.md` or `RAILWAY.md`** — those files are pushed to GitHub and are public if the repo is public. Use Railway/Vercel dashboards for secrets.

---

## Local env files (how it works today)

```
autoclipr/
├── .env                 ← all API + worker + shared secrets (local only)
├── apps/web/.env        ← NEXT_PUBLIC_* only (local web)
├── apps/api/            ← no .env (reads ../../.env via NestJS)
└── apps/workers/        ← no .env (reads ../../.env via NestJS)
```

API and workers load root `.env` automatically:

```ts
envFilePath: ['.env', '../../.env', '../../../.env']
```

**Production:** `.env` is not deployed. Set variables in **Vercel** and **Railway** dashboards.

---

## Architecture

```
User → Vercel (apps/web)
         ↓ NEXT_PUBLIC_API_URL
       Railway API (apps/api)
         ↓ Redis queue
       Railway Workers (apps/workers)
         ↓
       Supabase (mkwbdscwxpisrazqegtw.supabase.co)
```

---

## 1. GitHub

1. Push **one** repo (not 3 separate repos).
2. `.gitignore` excludes `.env`, `.env.local`.

---

## 2. Vercel (`apps/web`)

### Project settings

| Setting | Value |
|---------|--------|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Build Command | `npm run build` |
| Install Command | `npm install` |

### Variables — copy from `apps/web/.env` (change URLs for production)

| Variable | Local (current) | Production |
|----------|-----------------|------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://autoclipr.com` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | `https://api.autoclipr.com` (or Railway URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mkwbdscwxpisrazqegtw.supabase.co` | same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(from Supabase → API → publishable key)* | same key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | *(empty — optional)* | `pk_live_...` when billing is live |

**Do not put on Vercel:** `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, etc.

### Custom domain

Vercel → Domains → `autoclipr.com`, `www.autoclipr.com`

---

## 3. Railway API (`apps/api`)

Root Directory: `apps/api` · Builder: **Dockerfile**

### Variables — from root `.env` (API section)

| Variable | Local value | Production value |
|----------|-------------|------------------|
| `NODE_ENV` | `development` | `production` |
| `API_HOST` | `0.0.0.0` | `0.0.0.0` |
| `API_PORT` | `8080` | *(optional — Railway sets `PORT`)* |
| `API_PUBLIC_URL` | `http://localhost:8080` | `https://api.autoclipr.com` |
| `ALLOWED_ORIGINS` | `http://localhost:3000,https://autoclipr.ai,https://autoclipr.io,https://autoclipr.com` | add `https://www.autoclipr.com` + your `*.vercel.app` URL |
| `SUPABASE_URL` | `https://mkwbdscwxpisrazqegtw.supabase.co` | same |
| `SUPABASE_ANON_KEY` | *(publishable key — local `.env` only)* | same |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — local `.env` only | same (never expose to web) |
| `SUPABASE_JWT_SECRET` | **secret** — local `.env` only | same |
| `DATABASE_URL` | **secret** — pooler URL from Supabase | same |
| `JWT_SECRET` | **secret** — local `.env` only | same |
| `STORAGE_BUCKET_VIDEOS` | `videos` | `videos` |
| `STORAGE_BUCKET_CLIPS` | `clips` | `clips` |
| `STORAGE_BUCKET_EXPORTS` | `exports` | `exports` |
| `REDIS_URL` | `redis://localhost:6380` | `${{Redis.REDIS_URL}}` on Railway |
| `QUEUE_CLIP_PROCESSING` | `clip_processing` | `clip_processing` |
| `GOOGLE_CLIENT_ID` | *(from Google Cloud Console)* | same |
| `GOOGLE_CLIENT_SECRET` | **secret** — local `.env` only | same |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8080/api/v1/platforms/youtube/callback` | `https://api.autoclipr.com/api/v1/platforms/youtube/callback` |
| `STRIPE_SECRET_KEY` | *(empty)* | optional |
| `STRIPE_WEBHOOK_SECRET` | *(empty)* | optional |

### Database URL (use pooler — matches your `.env`)

```
postgresql://postgres.mkwbdscwxpisrazqegtw:YOUR_PASSWORD@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

Get password from Supabase → Settings → Database. URL-encode `@` and `#` in passwords.

### Health check

```bash
curl https://YOUR-API-DOMAIN/health
```

---

## 4. Railway Workers (`apps/workers`)

Root Directory: `apps/workers` · Builder: **Dockerfile** (ffmpeg + yt-dlp) · **no public URL**

### Variables — from root `.env` (workers / AI section)

| Variable | Local value | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `SUPABASE_URL` | `https://mkwbdscwxpisrazqegtw.supabase.co` | same |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — local `.env` only | same |
| `DATABASE_URL` | **secret** — pooler URL from Supabase | same |
| `REDIS_URL` | `redis://localhost:6380` | `${{Redis.REDIS_URL}}` |
| `QUEUE_CLIP_PROCESSING` | `clip_processing` | `clip_processing` |
| `OPENAI_API_KEY` | **secret** — local `.env` only | same |
| `WHISPER_MODEL` | `whisper-1` | `whisper-1` |
| `OPENAI_FALLBACK_ON_QUOTA` | `true` | `true` |
| `LLM_PROVIDER` | `deepseek` | `deepseek` |
| `DEEPSEEK_API_KEY` | **secret** — local `.env` only | same |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | `deepseek-v4-flash` |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | same |
| `OPENAI_MODEL` | `gpt-4o` | `gpt-4o` (if `LLM_PROVIDER=openai`) |
| `ASSEMBLYAI_API_KEY` | *(empty)* | optional |
| `STORAGE_BUCKET_VIDEOS` | `videos` | `videos` |
| `STORAGE_BUCKET_CLIPS` | `clips` | `clips` |
| `FFMPEG_PATH` | `ffmpeg` | `ffmpeg` |
| `FFPROBE_PATH` | `ffprobe` | `ffprobe` |
| `YTDLP_PATH` | `yt-dlp` | `yt-dlp` |

Workers do **not** need: `GOOGLE_*`, `ALLOWED_ORIGINS`, `API_PUBLIC_URL`, `JWT_SECRET`.

**Resources:** 2 GB+ RAM recommended for ffmpeg.

---

## 5. Redis

| Environment | `REDIS_URL` |
|-------------|-------------|
| Local | `redis://localhost:6380` (run `scripts/start-redis.ps1`) |
| Production | Railway Redis → `${{Redis.REDIS_URL}}` on API + workers |

---

## 6. Supabase (`mkwbdscwxpisrazqegtw`)

Dashboard: https://supabase.com/dashboard/project/mkwbdscwxpisrazqegtw

### Auth → URL configuration (production)

| Setting | Value |
|---------|--------|
| Site URL | `https://autoclipr.com` |
| Redirect URLs | `https://autoclipr.com/**`, `https://www.autoclipr.com/**`, `https://*.vercel.app/**` |

### Storage buckets

`videos`, `clips`, `exports` (match `STORAGE_BUCKET_*` in `.env`)

### Migrations

Run `supabase/migrations/001` … `009` in SQL Editor.

### Phone OTP (optional)

Authentication → Providers → Phone → Twilio (`MG…` Message Service SID).

---

## 7. Google OAuth (YouTube posting)

OAuth client already in `.env` — add **production** redirect in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

| Environment | Redirect URI |
|-------------|--------------|
| Local | `http://localhost:8080/api/v1/platforms/youtube/callback` |
| Production | `https://api.autoclipr.com/api/v1/platforms/youtube/callback` |

Enable **YouTube Data API v3**. Set `GOOGLE_*` on **Railway API only**.

---

## 8. Variable placement summary

```
LOCAL ONLY (gitignored)
├── .env                    → API + workers (all server secrets)
└── apps/web/.env           → NEXT_PUBLIC_* for Next.js

VERCEL (apps/web)
├── NEXT_PUBLIC_APP_URL
├── NEXT_PUBLIC_API_URL
├── NEXT_PUBLIC_SUPABASE_URL
├── NEXT_PUBLIC_SUPABASE_ANON_KEY
└── NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (optional)

RAILWAY API (apps/api)
├── SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
├── DATABASE_URL (pooler)
├── JWT_SECRET
├── REDIS_URL, QUEUE_CLIP_PROCESSING
├── ALLOWED_ORIGINS, API_PUBLIC_URL, API_HOST
├── STORAGE_BUCKET_*
├── GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
└── STRIPE_* (optional)

RAILWAY WORKERS (apps/workers)
├── SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
├── DATABASE_URL, REDIS_URL, QUEUE_CLIP_PROCESSING
├── OPENAI_API_KEY, WHISPER_MODEL, OPENAI_FALLBACK_ON_QUOTA
├── LLM_PROVIDER, DEEPSEEK_*, OPENAI_MODEL
├── STORAGE_BUCKET_VIDEOS, STORAGE_BUCKET_CLIPS
└── FFMPEG_PATH, FFPROBE_PATH, YTDLP_PATH

SUPABASE DASHBOARD (not env files)
├── Auth redirect URLs
├── Storage buckets
├── Migrations
└── Phone/Twilio (optional)
```

---

## 9. Deploy order

1. Supabase migrations + buckets  
2. Railway project + **Redis**  
3. Railway **API** (`apps/api`) → `/health` OK  
4. Railway **workers** (`apps/workers`) → logs show BullMQ worker  
5. **Vercel** web → `NEXT_PUBLIC_API_URL` = Railway API URL  
6. Supabase auth URLs + Google production redirect URI  
7. Test: register → create clip → download  

---

## 10. Local vs production quick reference

| Variable | Local | Production |
|----------|--------|------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://autoclipr.com` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Railway or `https://api.autoclipr.com` |
| `API_PUBLIC_URL` | `http://localhost:8080` | `https://api.autoclipr.com` |
| `REDIS_URL` | `redis://localhost:6380` | `${{Redis.REDIS_URL}}` |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8080/api/v1/platforms/youtube/callback` | `https://api.autoclipr.com/api/v1/platforms/youtube/callback` |
| `ALLOWED_ORIGINS` | includes `http://localhost:3000` | add Vercel URL + production domains |
| `SUPABASE_URL` | `https://mkwbdscwxpisrazqegtw.supabase.co` | same |

---

## 11. Security reminder

- Rotate any key that was ever committed or shared in chat.
- Never paste `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_SECRET`, or `DATABASE_URL` password into public docs or GitHub.
- Use Railway/Vercel **secret** variable type for sensitive values.

export default () => ({
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o',
  whisperModel: process.env.WHISPER_MODEL ?? 'whisper-1',
  /** Hook analysis LLM: openai | deepseek (DeepSeek is ~10× cheaper for tokens) */
  llmProvider: (process.env.LLM_PROVIDER ?? 'openai').toLowerCase(),
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
  deepseekModel: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  buckets: {
    videos: process.env.STORAGE_BUCKET_VIDEOS ?? 'videos',
    clips: process.env.STORAGE_BUCKET_CLIPS ?? 'clips',
    exports: process.env.STORAGE_BUCKET_EXPORTS ?? 'exports',
  },
  workDir: process.env.WORK_DIR ?? '',
  ffmpegPath: process.env.FFMPEG_PATH ?? 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH ?? 'ffprobe',
  ytdlpPath: process.env.YTDLP_PATH ?? 'yt-dlp',
  /** Supabase free tier: 50 MB per object. Set 0 to disable the client-side check. */
  storageMaxUploadBytes: Number(process.env.STORAGE_MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024),
  /** Optional max download height (0 = best available, no cap). */
  ytdlpMaxHeight: Number(process.env.YTDLP_MAX_HEIGHT ?? 0),
  /** Optional cap on source length in seconds (0 = no limit). */
  ytdlpMaxDurationSeconds: Number(process.env.YTDLP_MAX_DURATION_SECONDS ?? 0),
  /** Helps bypass YouTube bot checks on cloud IPs (Railway). Override via YTDLP_EXTRACTOR_ARGS.
   *  Leave empty so getExtractorVariants() can try multiple player_client fallbacks on failure. */
  ytdlpExtractorArgs: process.env.YTDLP_EXTRACTOR_ARGS ?? '',
  /** Optional Netscape cookies file — most reliable fix for YouTube on datacenter IPs. */
  ytdlpCookiesFile: process.env.YTDLP_COOKIES_FILE ?? '',
  /** Base64-encoded Netscape cookies file (Railway-friendly alternative to a file path). */
  ytdlpCookiesB64: process.env.YTDLP_COOKIES_B64 ?? '',
  /** Proxy for yt-dlp — use a residential proxy to bypass YouTube datacenter IP blocks.
   *  e.g. socks5://user:pass@host:port  or  http://user:pass@host:port */
  ytdlpProxy: process.env.YTDLP_PROXY ?? '',
  /** When true, continue pipeline with timed placeholder transcript if OpenAI quota/billing fails */
  openaiFallbackOnQuota: process.env.OPENAI_FALLBACK_ON_QUOTA !== 'false',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  metaAppId: process.env.META_APP_ID ?? '',
  metaAppSecret: process.env.META_APP_SECRET ?? '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'https://autoclipr.com',
});

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { runCommand } from './exec.util';
import { resolveBinary } from './resolve-binary.util';
import { resolveYtdlpCookiesFile } from './ytdlp-cookies.util';

/**
 * Player clients to try, in order, when no override is configured.
 *
 * Ordered on measurement, not theory. Resolving six videos with yt-dlp
 * 2026.08.19 and the pipeline's own format string, height picked per client:
 *
 *   video          tv_embedded  android_testsuite  android
 *   dQw4w9WgXcQ    2160p        2160p              360p
 *   aircAruvnKk    1080p        1080p              360p
 *   9bZkp7q19f0    1080p        1080p              360p
 *   5MgBikgcWnY    1080p        1080p              360p
 *   8jPQjjsBbIc     720p         720p              360p
 *   jNQXAC9IVRw     240p         240p              240p   (240p source)
 *
 * android is not wrong, it is capped: YouTube's SABR rollout hands it adaptive
 * formats with no URL, leaving only legacy progressive 18 at 640x360. Leading
 * with android therefore silently held every import to 360p while the app
 * offers HD and 4K export. The clients that still receive real adaptive URLs
 * go first; android stays beneath them as the permissive fallback.
 *
 * The rest fail rather than degrade: tv returns "The page needs to be
 * reloaded", and ios/mweb/web/web_safari/tv_simply return no video formats at
 * all ("Only images are available for download").
 *
 * Ordering has a cost — each failed variant is a full round trip — so the tail
 * is kept short and only holds clients that fail differently from the head.
 */
const DEFAULT_EXTRACTOR_VARIANTS = [
  'youtube:player_client=tv_embedded',
  'youtube:player_client=android_testsuite',
  'youtube:player_client=android',
  'youtube:player_client=ios',
  'youtube:player_client=mweb',
];

/** Hides proxy credentials so they never reach logs or user-facing errors. */
function maskProxy(proxy: string): string {
  return proxy.replace(/:\/\/[^@/]+@/, '://***@');
}

@Injectable()
export class YtdlpService implements OnModuleInit {
  private readonly logger = new Logger(YtdlpService.name);
  private readonly ytdlp: string;
  private cookiesFile?: string;
  /** `--js-runtimes node`, or empty when this yt-dlp predates the option. */
  private jsRuntimeArgs: string[] = [];

  constructor(private readonly config: ConfigService) {
    this.ytdlp = resolveBinary(this.config.get<string>('ytdlpPath'), 'yt-dlp');
    this.logger.log(`yt-dlp binary: ${this.ytdlp}`);
  }

  /**
   * Log the yt-dlp version at startup.
   *
   * The image installs yt-dlp unpinned, so the binary is only as fresh as the
   * last Docker build — and a cached layer can leave it months behind.
   * YouTube changes its bot detection constantly and yt-dlp ships fixes for it
   * weekly, so a stale binary looks exactly like an IP problem: every player
   * client fails a bot check while the proxy is demonstrably fine. Without
   * this line there is no way to tell those two apart from the logs.
   */
  private async logVersion(): Promise<void> {
    try {
      const { stdout } = await runCommand(this.ytdlp, ['--version'], { timeoutMs: 15_000 });
      this.logger.log(`yt-dlp version: ${stdout.trim()}`);
    } catch (err) {
      this.logger.warn(
        `Could not read the yt-dlp version: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Point yt-dlp at Node as its JavaScript runtime.
   *
   * yt-dlp needs a JS engine to run YouTube's player script, and only Deno is
   * enabled by default — the image has no Deno, so extraction ran in the
   * deprecated no-runtime mode and warned "some formats may be missing". It
   * does not have to be Deno: this image is built on node:22-alpine, so a
   * supported runtime is already installed and only needs naming.
   *
   * Probed rather than passed blindly. The option is recent, and a pinned
   * older YTDLP_VERSION would reject it as an unknown argument — which would
   * fail every download, a far worse outcome than the warning this removes.
   */
  private async detectJsRuntime(): Promise<void> {
    try {
      await runCommand(this.ytdlp, ['--js-runtimes', 'node', '--version'], {
        timeoutMs: 15_000,
      });
      this.jsRuntimeArgs = ['--js-runtimes', 'node'];
      this.logger.log('yt-dlp JavaScript runtime: node');
    } catch {
      this.logger.warn(
        'This yt-dlp does not accept --js-runtimes; continuing without an explicit ' +
          'JS runtime. Some YouTube formats may be missing.',
      );
    }
  }

  async onModuleInit(): Promise<void> {
    await this.logVersion();
    await this.detectJsRuntime();

    this.validateProxyConfig();

    try {
      this.cookiesFile = await resolveYtdlpCookiesFile({
        cookiesFile: this.config.get<string>('ytdlpCookiesFile'),
        cookiesB64: this.config.get<string>('ytdlpCookiesB64'),
      });
      if (this.cookiesFile) {
        this.logger.log(`YouTube cookies enabled (${this.cookiesFile})`);
      } else {
        this.logger.warn(
          'No YTDLP cookies configured — YouTube may block downloads from cloud IPs',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to load YouTube cookies: ${message}`);
    }
  }

  /**
   * Surfaces proxy misconfiguration at boot. Without this the first sign of a
   * bad YTDLP_PROXY is every download job failing, which is how a batch of 407s
   * went unnoticed: nothing logged the proxy state until a job already failed.
   */
  private validateProxyConfig(): void {
    const proxy = this.config.get<string>('ytdlpProxy')?.trim();

    if (!proxy) {
      this.logger.warn(
        'No YTDLP_PROXY configured — YouTube commonly blocks downloads from cloud IPs',
      );
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(proxy);
    } catch {
      this.logger.error(
        'YTDLP_PROXY is not a valid URL. Expected http://user:pass@host:port — downloads will fail.',
      );
      return;
    }

    if (!parsed.username || !parsed.password) {
      this.logger.warn(
        `YTDLP_PROXY (${maskProxy(proxy)}) has no credentials. If the proxy requires auth, downloads will fail with HTTP 407.`,
      );
      return;
    }

    // A raw "@" or ":" in the password splits the URL in the wrong place, so
    // the parsed host/credentials are silently wrong and the proxy answers 407.
    const rawUserInfo = proxy.slice(proxy.indexOf('://') + 3, proxy.lastIndexOf('@'));
    if (rawUserInfo.includes('@')) {
      this.logger.error(
        'YTDLP_PROXY credentials contain an unencoded "@". Percent-encode it as %40, otherwise the proxy will reject auth with HTTP 407.',
      );
      return;
    }

    this.logger.log(`yt-dlp proxy configured: ${maskProxy(proxy)}`);
  }

  private getExtractorVariants(): string[] {
    const custom = this.config.get<string>('ytdlpExtractorArgs')?.trim();
    if (custom) return [custom];

    // With cookies the web clients become worth trying: an authenticated
    // session is what satisfies the check they otherwise fail. They stay
    // behind the two that return adaptive URLs unauthenticated.
    if (this.cookiesFile) {
      return [
        'youtube:player_client=tv_embedded',
        'youtube:player_client=android_testsuite',
        'youtube:player_client=web',
        'youtube:player_client=android',
        'youtube:player_client=ios',
        'youtube:player_client=mweb',
      ];
    }

    return DEFAULT_EXTRACTOR_VARIANTS;
  }

  private buildBaseArgs(
    outTemplate: string,
    format: string,
    extractorArgs: string,
  ): string[] {
    const args = [
      ...this.jsRuntimeArgs,
      '--no-playlist',
      '--geo-bypass',
      '--retries',
      '5',
      '--fragment-retries',
      '5',
      '--extractor-retries',
      '3',
      '--retry-sleep',
      'exp=1:30',
      '--sleep-interval',
      '2',
      '--max-sleep-interval',
      '8',
      '--sleep-requests',
      '2',
      '--socket-timeout',
      '30',
      '-f',
      format,
      '--merge-output-format',
      'mp4',
      '-o',
      outTemplate,
      '--extractor-args',
      extractorArgs,
    ];

    if (this.cookiesFile) {
      args.push('--cookies', this.cookiesFile);
    }

    const proxy = this.config.get<string>('ytdlpProxy')?.trim();
    if (proxy) {
      args.push('--proxy', proxy);
    }

    return args;
  }

  async download(
    url: string,
    outputPath: string,
  ): Promise<{ title?: string; durationSeconds?: number }> {
    const outDir = path.dirname(outputPath);
    const outTemplate = path.join(outDir, 'source.%(ext)s');
    const maxHeight = this.config.get<number>('ytdlpMaxHeight') ?? 0;
    const maxDuration = this.config.get<number>('ytdlpMaxDurationSeconds') ?? 0;

    await fs.mkdir(outDir, { recursive: true });

    const qualityLabel = maxHeight > 0 ? `${maxHeight}p max` : 'best available';
    this.logger.log(`Downloading with yt-dlp (${qualityLabel}): ${url}`);

    const format =
      maxHeight > 0
        ? [
            `bestvideo[height<=${maxHeight}]+bestaudio`,
            `best[height<=${maxHeight}]`,
            'best',
          ].join('/')
        : 'bestvideo+bestaudio/best';

    const variants = this.getExtractorVariants();
    let lastError: Error | null = null;
    // Which client actually worked. The title lookup reuses it rather than
    // always asking variants[0], which by then may be the one that just failed.
    let workingVariant = variants[0];

    for (let i = 0; i < variants.length; i++) {
      const extractorArgs = variants[i];
      try {
        await this.runDownload(url, outDir, outTemplate, format, maxDuration, extractorArgs);
        workingVariant = extractorArgs;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const retryable = this.isRetryableYoutubeError(lastError.message);
        const hasMore = i < variants.length - 1;
        if (!retryable || !hasMore) {
          throw new Error(this.formatYtdlpError(lastError));
        }
        this.logger.warn(
          `yt-dlp retry (${i + 2}/${variants.length}) after: ${lastError.message.slice(0, 160)}`,
        );
        await this.cleanPartialDownload(outDir);
      }
    }

    await this.ensureOutputFile(outDir, outputPath);

    let title: string | undefined;
    try {
      title = await this.fetchTitle(url, workingVariant);
    } catch {
      // optional metadata
    }

    return { title };
  }

  private async runDownload(
    url: string,
    outDir: string,
    outTemplate: string,
    format: string,
    maxDuration: number,
    extractorArgs: string,
  ): Promise<void> {
    const args = this.buildBaseArgs(outTemplate, format, extractorArgs);
    if (maxDuration > 0) {
      args.push('--match-filter', `duration<=${maxDuration}`);
    }
    args.push(url);

    await runCommand(this.ytdlp, args, { timeoutMs: 1_800_000 });
  }

  private async ensureOutputFile(outDir: string, outputPath: string): Promise<void> {
    const exists = await fs.stat(outputPath).then(() => true).catch(() => false);
    if (exists) return;

    const dirFiles = await fs.readdir(outDir);
    const mp4 = dirFiles.find((f) => f.endsWith('.mp4'));
    if (mp4) {
      await fs.rename(path.join(outDir, mp4), outputPath);
      return;
    }

    throw new Error('yt-dlp finished but output MP4 was not found');
  }

  private async cleanPartialDownload(outDir: string): Promise<void> {
    const files = await fs.readdir(outDir).catch(() => [] as string[]);
    await Promise.all(
      files
        .filter((f) => f.startsWith('source.') || f.endsWith('.part'))
        .map((f) => fs.rm(path.join(outDir, f), { force: true })),
    );
  }

  private async fetchTitle(url: string, extractorArgs: string): Promise<string | undefined> {
    const args = [
      ...this.jsRuntimeArgs,
      '--print',
      '%(title)s',
      '--no-download',
      '--extractor-args',
      extractorArgs,
    ];
    if (this.cookiesFile) {
      args.push('--cookies', this.cookiesFile);
    }
    const proxy = this.config.get<string>('ytdlpProxy')?.trim();
    if (proxy) {
      args.push('--proxy', proxy);
    }
    args.push(url);

    const { stdout } = await runCommand(this.ytdlp, args, { timeoutMs: 60_000 });
    return stdout.trim() || undefined;
  }

  private isRetryableYoutubeError(message: string): boolean {
    // Proxy errors are never retryable — every variant will fail the same way
    if (
      /unsupported proxy type|proxy.*failed|cannot connect.*proxy|unable to connect to proxy|407 proxy authentication required/i.test(
        message,
      )
    ) {
      return false;
    }

    // Client-specific refusals. These are not "this video cannot be
    // downloaded" — they are "not by this player client", which is exactly
    // when the next variant is worth a try. tv_embedded in particular refuses
    // videos whose owner disabled embedding, and it now leads the list, so
    // without these the loop would abort on the first variant for every such
    // video instead of falling through to android.
    if (
      /playback on other websites has been disabled|not available on this app|the page needs to be reloaded|only images are available/i.test(
        message,
      )
    ) {
      return true;
    }

    return /sign in to confirm|not a bot|http error 403|http error 429|unable to extract|login required|confirm your age|bot check|requested format is not available|format is not available/i.test(
      message,
    );
  }

  private formatYtdlpError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    const normalized = raw.replace(/^(yt-dlp failed:\s*)+/i, '').trim();

    // The proxy rejected our credentials outright. Distinct from a proxy that
    // is unreachable or misconfigured — here we connected and were refused.
    if (/407 proxy authentication required|proxy authentication required/i.test(normalized)) {
      return (
        `The download proxy rejected our credentials (HTTP 407). ` +
        `Update YTDLP_PROXY on the worker service — the username or password is wrong or expired. ` +
        `Note that special characters in the password must be percent-encoded ` +
        `(for example "@" becomes "%40").`
      );
    }
    if (
      /unsupported proxy type|unsupported url scheme.*websocket|unable to connect to proxy/i.test(
        normalized,
      )
    ) {
      const proxy = this.config.get<string>('ytdlpProxy')?.trim();
      return proxy
        ? `Proxy connection failed (${maskProxy(proxy)}). Check that the proxy is online and the credentials are correct in YTDLP_PROXY.`
        : 'No proxy configured. YouTube is blocking downloads from this server\'s IP. Set YTDLP_PROXY in Railway environment variables (e.g. http://user:pass@host:port).';
    }
    if (/sign in to confirm|not a bot|bot check/i.test(normalized)) {
      // Every player client has now been tried and all of them were
      // challenged, so this is not a client-selection problem — the exit IP
      // itself is flagged. Naming that IP is the whole point of the line: the
      // user-facing copy is deliberately vague, which left the logs saying
      // only "bot check" and gave no way to tell a burned proxy apart from a
      // stale yt-dlp or a bad client order without reproducing it by hand.
      const proxy = this.config.get<string>('ytdlpProxy')?.trim();
      this.logger.error(
        proxy
          ? `YouTube challenged every player client through ${maskProxy(proxy)}. ` +
              `That exit IP is flagged — a PO token will not clear it. Rotate to a ` +
              `different proxy endpoint, or supply YTDLP_COOKIES_B64 from a signed-in account.`
          : `YouTube challenged every player client and no YTDLP_PROXY is set, so ` +
              `requests are leaving from the datacenter IP directly. Configure a ` +
              `residential proxy, or supply YTDLP_COOKIES_B64 from a signed-in account.`,
      );

      return (
        'YouTube blocked the download from our cloud server (bot check). ' +
        'Upload the MP4 file directly on the Upload page, try again later, ' +
        'or enable YouTube cookies on the worker (YTDLP_COOKIES_B64 in Railway).'
      );
    }
    if (/private video|members.only|login required|confirm your age/i.test(normalized)) {
      return 'This YouTube video is private, age-restricted, or requires sign-in. Use a public video or upload the file directly.';
    }

    const short = normalized.length <= 280 ? normalized : `${normalized.slice(0, 277).trim()}…`;
    return short.startsWith('yt-dlp') ? short : `yt-dlp failed: ${short}`;
  }
}

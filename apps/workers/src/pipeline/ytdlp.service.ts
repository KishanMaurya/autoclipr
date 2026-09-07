import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { runCommand } from './exec.util';
import { resolveBinary } from './resolve-binary.util';
import { resolveYtdlpCookiesFile } from './ytdlp-cookies.util';
import { withDiagnosis } from './pipeline-error.util';

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

/**
 * How many exit IPs a single download may try before giving up.
 *
 * YouTube flags individual addresses, not providers: on one Webshare plan, 4
 * of 10 datacenter IPs served 1080p while the other 6 were challenged, and the
 * working ones stayed working across repeated checks. A single proxy is
 * therefore a coin flip, and each additional address compounds against it.
 *
 * Six is where the curve flattens. At the measured ~40% per-address success
 * rate, six draws clears 95%; the attempts beyond that buy fractions of a
 * percent while every one of them is a round trip a user waits through.
 *
 * Shared across the whole download rather than per player client. Per client
 * it multiplies — five clients times six addresses is thirty round trips to
 * learn the same thing.
 */
const MAX_PROXY_ATTEMPTS = 6;

/** Gap between attempts, so a rotating gateway hands out a different IP. */
const FLAGGED_IP_RETRY_DELAY_MS = 1_500;

/** Split YTDLP_PROXY into its entries. One address is just a list of one. */
function parseProxyList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Hides proxy credentials so they never reach logs or user-facing errors. */
function maskProxy(proxy: string): string {
  return proxy.replace(/:\/\/[^@/]+@/, '://***@');
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Is this host a literal address rather than a name?
 *
 * URL keeps IPv6 hosts in brackets, so the bracket test is exact; IPv4 is a
 * four-octet check. Anything else is a hostname, which may resolve to many
 * addresses and so could legitimately rotate.
 */
function isIpLiteral(hostname: string): boolean {
  if (hostname.startsWith('[')) return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
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
    const proxies = parseProxyList(this.config.get<string>('ytdlpProxy'));

    if (proxies.length === 0) {
      this.logger.warn(
        'No YTDLP_PROXY configured — YouTube commonly blocks downloads from cloud IPs',
      );
      return;
    }

    for (const proxy of proxies) {
      if (!this.validateOneProxy(proxy)) return;
    }

    if (proxies.length > 1) {
      // The configuration that actually survives: YouTube flags addresses, not
      // providers, so a list converts a per-address coin flip into a
      // near-certainty by trying a different one each time.
      this.logger.log(
        `yt-dlp proxies configured: ${proxies.length} exits, up to ` +
          `${Math.min(proxies.length, MAX_PROXY_ATTEMPTS)} tried per download ` +
          `(${proxies.map(maskProxy).join(', ')})`,
      );
      return;
    }

    const only = proxies[0];
    const host = new URL(only).hostname;

    if (this.config.get<boolean>('ytdlpProxyRotating')) {
      // A rotating gateway is a hostname resolving to many exits, so a bare IP
      // literal cannot be one and the flag is describing something the
      // endpoint is not. Unchecked, the worker spends every attempt on the
      // same flagged address and then reports having tried several distinct
      // IPs — a diagnosis that sends the next person after the wrong problem.
      if (isIpLiteral(host)) {
        this.logger.warn(
          `YTDLP_PROXY_ROTATING=true but YTDLP_PROXY is the bare IP ${host}, which ` +
            `cannot rotate — every attempt reuses that one exit. Either list several ` +
            `proxies in YTDLP_PROXY (comma-separated), point it at a rotating hostname, ` +
            `or set YTDLP_PROXY_ROTATING=false.`,
        );
      }
      this.logger.log(
        `yt-dlp proxy configured: ${maskProxy(only)} (rotating — up to ` +
          `${MAX_PROXY_ATTEMPTS} draws per download)`,
      );
      return;
    }

    this.logger.log(
      `yt-dlp proxy configured: ${maskProxy(only)} (single exit IP, no fallback). ` +
        `A bot check on this address fails the import outright — list several ` +
        `proxies in YTDLP_PROXY, comma-separated, so a flagged one is stepped over.`,
    );
  }

  /** Validate one proxy URL. Returns false when it is unusable. */
  private validateOneProxy(proxy: string): boolean {
    let parsed: URL;
    try {
      parsed = new URL(proxy);
    } catch {
      this.logger.error(
        `YTDLP_PROXY entry "${maskProxy(proxy)}" is not a valid URL. Expected ` +
          `http://user:pass@host:port — downloads will fail. Note that quotes around ` +
          `the value become part of it.`,
      );
      return false;
    }

    if (!parsed.username || !parsed.password) {
      this.logger.warn(
        `YTDLP_PROXY entry (${maskProxy(proxy)}) has no credentials. If the proxy ` +
          `requires auth, downloads will fail with HTTP 407.`,
      );
      return false;
    }

    // A raw "@" in the password splits the URL in the wrong place, so the
    // parsed host/credentials are silently wrong and the proxy answers 407.
    const rawUserInfo = proxy.slice(proxy.indexOf('://') + 3, proxy.lastIndexOf('@'));
    if (rawUserInfo.includes('@')) {
      this.logger.error(
        'YTDLP_PROXY credentials contain an unencoded "@". Percent-encode it as %40, ' +
          'otherwise the proxy will reject auth with HTTP 407.',
      );
      return false;
    }

    return true;
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

  /**
   * The proxies to try, in order, for one download.
   *
   * Three configurations collapse into one sequence, so the retry loop needs
   * to know nothing about which is in use:
   *   - a list       -> each address in turn (this is the effective one)
   *   - one rotating -> the same URL repeatedly; the gateway varies the exit
   *   - one static   -> a single attempt, since re-running it cannot differ
   *   - none         -> a single attempt with no --proxy at all
   *
   * Shuffled for a list so concurrent jobs do not all queue behind the same
   * first address, and so a flagged head does not tax every single import.
   */
  private proxyAttemptOrder(): (string | undefined)[] {
    const proxies = parseProxyList(this.config.get<string>('ytdlpProxy'));

    if (proxies.length === 0) return [undefined];

    if (proxies.length === 1) {
      const only = proxies[0];
      // A rotating gateway is worth asking more than once; a fixed address is
      // not — it was measured to return the identical challenge every time.
      return this.config.get<boolean>('ytdlpProxyRotating')
        ? Array<string>(MAX_PROXY_ATTEMPTS).fill(only)
        : [only];
    }

    const shuffled = [...proxies];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, MAX_PROXY_ATTEMPTS);
  }

  private buildBaseArgs(
    outTemplate: string,
    format: string,
    extractorArgs: string,
    proxy: string | undefined,
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

    // Exit IPs to work through. Shared across the whole download: a flagged
    // address is flagged for every player client, so spending the sequence
    // again per client would only repeat the same challenges.
    const proxyOrder = this.proxyAttemptOrder();
    let proxyIndex = 0;
    // The proxy that worked, so the title lookup does not go back to a
    // flagged one and quietly lose the title.
    let workingProxy = proxyOrder[0];

    outer: for (let i = 0; i < variants.length; i++) {
      const extractorArgs = variants[i];

      // Inner loop only re-runs while advancing through the proxy sequence;
      // every other outcome leaves it after one attempt.
      for (;;) {
        const proxy = proxyOrder[proxyIndex];
        try {
          await this.runDownload(
            url, outDir, outTemplate, format, maxDuration, extractorArgs, proxy,
          );
          workingVariant = extractorArgs;
          workingProxy = proxy;
          break outer;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          await this.cleanPartialDownload(outDir);

          // A flagged IP is the one failure a different IP fixes. Everything
          // else here is the client's own limitation — it would recur on any
          // address — so those fall straight through to the next client.
          if (this.isFlaggedIpError(lastError.message) && proxyIndex < proxyOrder.length - 1) {
            proxyIndex++;
            this.logger.warn(
              `yt-dlp bot check on ${extractorArgs} via ` +
                `${proxy ? maskProxy(proxy) : 'no proxy'}; trying exit ` +
                `${proxyIndex + 1} of ${proxyOrder.length}`,
            );
            await delay(FLAGGED_IP_RETRY_DELAY_MS);
            continue;
          }

          const hasMore = i < variants.length - 1;
          if (!this.isRetryableYoutubeError(lastError.message) || !hasMore) {
            throw this.toReportableError(lastError);
          }

          this.logger.warn(
            `yt-dlp retry (${i + 2}/${variants.length}) after: ${lastError.message.slice(0, 160)}`,
          );
          break;
        }
      }
    }

    await this.ensureOutputFile(outDir, outputPath);

    let title: string | undefined;
    try {
      title = await this.fetchTitle(url, workingVariant, workingProxy);
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
    proxy: string | undefined,
  ): Promise<void> {
    const args = this.buildBaseArgs(outTemplate, format, extractorArgs, proxy);
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

  private async fetchTitle(
    url: string,
    extractorArgs: string,
    proxy: string | undefined,
  ): Promise<string | undefined> {
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
    if (proxy) {
      args.push('--proxy', proxy);
    }
    args.push(url);

    const { stdout } = await runCommand(this.ytdlp, args, { timeoutMs: 60_000 });
    return stdout.trim() || undefined;
  }

  /**
   * Does this failure point at the exit IP rather than the player client?
   *
   * Deliberately narrow. Only the challenge and the two rate-limit statuses
   * are properties of *who is asking*; a missing format or a client-specific
   * refusal follows the request to any IP, so retrying those on a fresh one
   * just spends a user's time to reach the same error.
   */
  private isFlaggedIpError(message: string): boolean {
    return /sign in to confirm|not a bot|bot check|http error 429|http error 403/i.test(
      message,
    );
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

  /**
   * Operator-facing cause and remedy for a failure, or undefined when the
   * user-facing message already says everything there is to say.
   *
   * Returned rather than logged. Logged, it landed in an entry of its own
   * while every alert and dashboard quoted the failure event instead — so the
   * cause was present in the logs and still never reached the person reading
   * about the symptom.
   */
  private diagnose(normalized: string): string | undefined {
    if (!/sign in to confirm|not a bot|bot check/i.test(normalized)) return undefined;

    // Every player client was tried and all were challenged, so this is not a
    // client-selection problem — the exit IP itself is flagged.
    const proxies = parseProxyList(this.config.get<string>('ytdlpProxy'));
    const rotating = this.config.get<boolean>('ytdlpProxyRotating');

    if (proxies.length === 0) {
      return (
        'No YTDLP_PROXY is set, so requests leave from the datacenter IP directly and ' +
        'YouTube challenges every player client. List several proxies in YTDLP_PROXY ' +
        '(comma-separated), or supply YTDLP_COOKIES_B64 from a signed-in throwaway account.'
      );
    }

    if (proxies.length > 1) {
      // Distinct addresses were genuinely tried and all were challenged. On a
      // pool where roughly 4 in 10 work, this run was either unlucky or the
      // working addresses have since been flagged.
      const tried = Math.min(proxies.length, MAX_PROXY_ATTEMPTS);
      return (
        `Challenged on all ${tried} of the ${proxies.length} configured exits. Verify ` +
        'which still work — curl each through https://ipv4.webshare.io/ then try one ' +
        'with yt-dlp — and drop the flagged ones, or supply YTDLP_COOKIES_B64 from a ' +
        'signed-in throwaway account.'
      );
    }

    const only = maskProxy(proxies[0]);

    if (rotating) {
      return (
        `Challenged on all ${MAX_PROXY_ATTEMPTS} draws from ${only}. A rotating gateway ` +
        'draws from the provider\'s whole pool, which is mostly flagged — measured at ' +
        'roughly 1 in 6 usable, against 4 in 10 for hand-picked addresses. List the ' +
        'specific proxies that work in YTDLP_PROXY, comma-separated, instead.'
      );
    }

    return (
      `Challenged on ${only}, the only configured exit, so there was nothing to fall ` +
      'back to. List several proxies in YTDLP_PROXY, comma-separated — YouTube flags ' +
      'individual addresses, so a second one usually succeeds where the first failed.'
    );
  }

  /**
   * The error to surface: customer-safe message, operator diagnosis attached.
   *
   * Both readers are served by one object, so the cause cannot drift away from
   * the symptom into a different log entry.
   */
  private toReportableError(err: unknown): Error {
    const raw = err instanceof Error ? err.message : String(err);
    const normalized = raw.replace(/^(yt-dlp failed:\s*)+/i, '').trim();
    const error = new Error(this.formatYtdlpError(err));

    const diagnosis = this.diagnose(normalized);
    if (!diagnosis) return error;

    // Still logged, for anyone tailing the worker rather than reading events.
    this.logger.error(`yt-dlp diagnosis: ${diagnosis}`);
    return withDiagnosis(error, diagnosis);
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

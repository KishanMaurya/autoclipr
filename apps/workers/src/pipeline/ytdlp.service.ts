import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { runCommand } from './exec.util';
import { resolveBinary } from './resolve-binary.util';
import { resolveYtdlpCookiesFile } from './ytdlp-cookies.util';

// Variants tried in order when no custom YTDLP_EXTRACTOR_ARGS is set (no cookies)
const DEFAULT_EXTRACTOR_VARIANTS = [
  'youtube:player_client=mweb',
  'youtube:player_client=android',
  'youtube:player_client=ios',
];

@Injectable()
export class YtdlpService implements OnModuleInit {
  private readonly logger = new Logger(YtdlpService.name);
  private readonly ytdlp: string;
  private cookiesFile?: string;

  constructor(private readonly config: ConfigService) {
    this.ytdlp = resolveBinary(this.config.get<string>('ytdlpPath'), 'yt-dlp');
    this.logger.log(`yt-dlp binary: ${this.ytdlp}`);
  }

  async onModuleInit(): Promise<void> {
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

  private getExtractorVariants(): string[] {
    const custom = this.config.get<string>('ytdlpExtractorArgs')?.trim();
    if (custom) return [custom];

    if (this.cookiesFile) {
      // With cookies: web client authenticates properly and gets a valid PO token
      return [
        'youtube:player_client=web',
        'youtube:player_client=android',
        'youtube:player_client=mweb',
        'youtube:player_client=ios',
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
      '--no-playlist',
      '--no-check-formats',
      '--no-warnings',
      '--retries',
      '5',
      '--fragment-retries',
      '5',
      '--extractor-retries',
      '3',
      '--sleep-interval',
      '1',
      '--sleep-requests',
      '1',
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

    const proxy = this.config.get<string>('ytdlpProxy');
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
            `bestvideo[height<=${maxHeight}][ext=mp4]+bestaudio[ext=m4a]`,
            `bestvideo[height<=${maxHeight}]+bestaudio`,
            `best[height<=${maxHeight}][ext=mp4]`,
            `best[height<=${maxHeight}]`,
            'best[ext=mp4]/best',
          ].join('/')
        : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best';

    const variants = this.getExtractorVariants();
    let lastError: Error | null = null;

    for (let i = 0; i < variants.length; i++) {
      const extractorArgs = variants[i];
      try {
        await this.runDownload(url, outDir, outTemplate, format, maxDuration, extractorArgs);
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
      title = await this.fetchTitle(url, variants[0]);
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
    const args = ['--print', '%(title)s', '--no-download', '--extractor-args', extractorArgs];
    if (this.cookiesFile) {
      args.push('--cookies', this.cookiesFile);
    }
    const proxy = this.config.get<string>('ytdlpProxy');
    if (proxy) {
      args.push('--proxy', proxy);
    }
    args.push(url);

    const { stdout } = await runCommand(this.ytdlp, args, { timeoutMs: 60_000 });
    return stdout.trim() || undefined;
  }

  private isRetryableYoutubeError(message: string): boolean {
    return /sign in to confirm|not a bot|http error 403|http error 429|unable to extract|login required|confirm your age|bot check/i.test(
      message,
    );
  }

  private formatYtdlpError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    const normalized = raw.replace(/^(yt-dlp failed:\s*)+/i, '').trim();

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

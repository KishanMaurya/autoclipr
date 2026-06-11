import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { runCommand } from './exec.util';
import { resolveBinary } from './resolve-binary.util';

@Injectable()
export class YtdlpService {
  private readonly logger = new Logger(YtdlpService.name);
  private readonly ytdlp: string;

  constructor(private readonly config: ConfigService) {
    this.ytdlp = resolveBinary(this.config.get<string>('ytdlpPath'), 'yt-dlp');
    this.logger.log(`yt-dlp binary: ${this.ytdlp}`);
  }

  private buildBaseArgs(outTemplate: string, format: string): string[] {
    const args = [
      '--no-playlist',
      '--no-warnings',
      '--retries',
      '10',
      '--fragment-retries',
      '10',
      '--socket-timeout',
      '30',
      '-f',
      format,
      '--merge-output-format',
      'mp4',
      '-o',
      outTemplate,
    ];

    const extractorArgs = this.config.get<string>('ytdlpExtractorArgs');
    if (extractorArgs?.trim()) {
      args.push('--extractor-args', extractorArgs.trim());
    }

    const cookiesFile = this.config.get<string>('ytdlpCookiesFile')?.trim();
    if (cookiesFile) {
      args.push('--cookies', cookiesFile);
    }

    return args;
  }

  async download(url: string, outputPath: string): Promise<{ title?: string; durationSeconds?: number }> {
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

    const args = this.buildBaseArgs(outTemplate, format);

    if (maxDuration > 0) {
      args.push('--match-filter', `duration<=${maxDuration}`);
    }

    args.push(url);

    try {
      await runCommand(this.ytdlp, args, { timeoutMs: 1_800_000 });
    } catch (err) {
      throw new Error(this.formatYtdlpError(err));
    }

    const exists = await fs.stat(outputPath).then(() => true).catch(() => false);
    if (!exists) {
      const dirFiles = await fs.readdir(outDir);
      const mp4 = dirFiles.find((f) => f.endsWith('.mp4'));
      if (mp4) {
        const found = path.join(outDir, mp4);
        await fs.rename(found, outputPath);
      } else {
        throw new Error('yt-dlp finished but output MP4 was not found');
      }
    }

    let title: string | undefined;
    try {
      const { stdout } = await runCommand(this.ytdlp, ['--print', '%(title)s', '--no-download', url], {
        timeoutMs: 60_000,
      });
      title = stdout.trim() || undefined;
    } catch {
      // optional metadata
    }

    return { title };
  }

  private formatYtdlpError(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    if (/sign in to confirm you're not a bot/i.test(raw)) {
      return (
        'YouTube blocked the download from our cloud server (bot check). ' +
        'Try again later, upload the MP4 file directly, or ask support to enable YouTube cookies on the worker.'
      );
    }
    if (/private video|members.only|login required/i.test(raw)) {
      return 'This YouTube video is private or requires sign-in. Use a public video or upload the file directly.';
    }
    return `yt-dlp failed: ${raw}`;
  }
}

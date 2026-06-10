import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import type { TranscriptResult, TranscriptSegment } from './types';
import {
  formatOpenAiError,
  isQuotaOrBillingError,
  isRetryableOpenAiError,
  sleep,
} from './openai-error.util';

const MAX_BYTES = 24 * 1024 * 1024;
const WHISPER_RETRIES = 3;

export type TranscribeOptions = {
  durationSeconds?: number;
  allowFallback?: boolean;
};

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly openai: OpenAI | null;
  private readonly model: string;
  private readonly fallbackOnQuota: boolean;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('openaiApiKey');
    this.model = this.config.get<string>('whisperModel') ?? 'whisper-1';
    this.fallbackOnQuota = this.config.get<boolean>('openaiFallbackOnQuota') ?? true;
    this.openai = key
      ? new OpenAI({
          apiKey: key,
          maxRetries: 0,
          timeout: 10 * 60 * 1000,
        })
      : null;
  }

  isAvailable(): boolean {
    return !!this.openai;
  }

  async transcribe(
    audioPath: string,
    languageHint?: string,
    options?: TranscribeOptions,
  ): Promise<TranscriptResult> {
    const durationSeconds = options?.durationSeconds ?? 300;
    const allowFallback = options?.allowFallback ?? this.fallbackOnQuota;

    if (!this.openai) {
      this.logger.warn('OPENAI_API_KEY missing — using placeholder transcript');
      return this.fallbackTranscript(durationSeconds, 'OPENAI_API_KEY not set');
    }

    const stat = await fs.stat(audioPath);
    const audioTooLarge = stat.size > MAX_BYTES;
    if (audioTooLarge) {
      this.logger.warn(
        `Audio is ${Math.round(stat.size / 1024 / 1024)} MB (Whisper limit 25 MB) — transcription may fail`,
      );
    }

    this.logger.log(`Whisper transcription (${this.model})`);

    let lastErr: unknown;
    for (let attempt = 1; attempt <= WHISPER_RETRIES; attempt++) {
      try {
        const response = await this.openai!.audio.transcriptions.create({
          file: createReadStream(audioPath),
          model: this.model,
          language: languageHint && languageHint !== 'en' ? languageHint : undefined,
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
        });

        const verbose = response as unknown as {
          text?: string;
          language?: string;
          segments?: Array<{ start: number; end: number; text: string }>;
        };

        const segments: TranscriptSegment[] = (verbose.segments ?? []).map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text.trim(),
        }));

        return {
          text: verbose.text?.trim() ?? segments.map((s) => s.text).join(' '),
          segments,
          language: verbose.language,
        };
      } catch (err) {
        lastErr = err;
        if (attempt < WHISPER_RETRIES && isRetryableOpenAiError(err)) {
          this.logger.warn(`Whisper attempt ${attempt}/${WHISPER_RETRIES} failed, retrying…`);
          await sleep(2000 * attempt);
          continue;
        }
        break;
      }
    }

    if (allowFallback && isQuotaOrBillingError(lastErr)) {
      const reason =
        'OpenAI billing/quota — add credits at https://platform.openai.com/account/billing';
      this.logger.warn(`Whisper unavailable (${reason}). Using timed fallback segments.`);
      return this.fallbackTranscript(durationSeconds, reason);
    }

    throw formatOpenAiError(
      'OpenAI Whisper',
      lastErr,
      audioTooLarge ? 'Audio exceeds Whisper 25 MB limit — use a shorter source video.' : undefined,
    );
  }

  private fallbackTranscript(durationSeconds: number, reason: string): TranscriptResult {
    const safeDuration = Math.max(30, Math.min(durationSeconds, 7200));
    const segments: TranscriptSegment[] = [];
    const chunk = 8;

    for (let t = 0; t < safeDuration; t += chunk) {
      segments.push({
        start: t,
        end: Math.min(t + chunk, safeDuration),
        text: `Segment at ${t}s`,
      });
    }

    return {
      text: segments.map((s) => s.text).join(' '),
      segments,
      language: 'en',
      fallback: true,
      fallback_reason: reason,
    };
  }
}

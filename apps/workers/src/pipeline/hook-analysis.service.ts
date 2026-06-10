import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type OpenAI from 'openai';
import type { TranscriptResult, ViralMoment } from './types';
import { createHookAnalysisLlmClient } from './llm-client.util';

@Injectable()
export class HookAnalysisService implements OnModuleInit {
  private readonly logger = new Logger(HookAnalysisService.name);
  private llm: OpenAI | null = null;
  private model = 'gpt-4o';
  private providerLabel = 'OpenAI';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cfg = createHookAnalysisLlmClient(this.config);
    this.llm = cfg.client;
    this.model = cfg.model;
    this.providerLabel = cfg.label;

    if (cfg.client) {
      this.logger.log(`Hook analysis LLM: ${cfg.label}`);
    } else if (cfg.provider === 'deepseek') {
      this.logger.warn('DEEPSEEK_API_KEY missing — hook analysis will use heuristics only');
    } else {
      this.logger.warn('OPENAI_API_KEY missing — hook analysis will use heuristics only');
    }
  }

  getProviderLabel(): string {
    return this.providerLabel;
  }

  async identifyMoments(
    transcript: TranscriptResult,
    videoDurationSec: number,
    clipCount: number,
    durations: number[],
  ): Promise<ViralMoment[]> {
    if (this.llm && transcript.segments.length > 0) {
      try {
        return await this.identifyWithLlm(transcript, videoDurationSec, clipCount, durations);
      } catch (err) {
        this.logger.warn(`${this.providerLabel} hook analysis failed, using heuristic: ${err}`);
      }
    }

    return this.heuristicMoments(transcript, videoDurationSec, clipCount, durations);
  }

  private async identifyWithLlm(
    transcript: TranscriptResult,
    videoDurationSec: number,
    clipCount: number,
    durations: number[],
  ): Promise<ViralMoment[]> {
    const segmentLines = transcript.segments
      .slice(0, 200)
      .map((s) => `[${Math.round(s.start * 1000)}-${Math.round(s.end * 1000)}] ${s.text}`)
      .join('\n');

    const targetDurations = durations.join(', ');

    const prompt = `You are a viral short-form video editor. Given transcript segments with millisecond timestamps, pick exactly ${clipCount} clips for TikTok/Reels/Shorts.

Video duration: ${videoDurationSec} seconds.
Target clip lengths (seconds, pick closest per clip): ${targetDurations}.

Return ONLY valid JSON object (no markdown):
{ "clips": [
  {
    "start_ms": number,
    "end_ms": number,
    "title": string,
    "hook_text": string,
    "viral_score": number (70-98),
    "metrics": {
      "hook_strength": number,
      "engagement_prediction": number,
      "retention_prediction": number,
      "social_share_potential": number
    }
  }
] }

Rules:
- Each clip must be within video bounds.
- Prefer strong hooks, emotional peaks, actionable tips, controversy, story payoffs.
- end_ms - start_ms should match one of the target durations (±2s).
- Clips must not overlap heavily.

Transcript:
${segmentLines}`;

    const completion = await this.llm!.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You output only valid JSON for video editors.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { clips?: ViralMoment[] } | ViralMoment[];
    const list = Array.isArray(parsed) ? parsed : (parsed.clips ?? []);

    return this.normalizeMoments(list, videoDurationSec, clipCount, durations);
  }

  private heuristicMoments(
    transcript: TranscriptResult,
    videoDurationSec: number,
    clipCount: number,
    durations: number[],
  ): ViralMoment[] {
    const maxMs = videoDurationSec * 1000;
    const moments: ViralMoment[] = [];
    const step = Math.floor(maxMs / (clipCount + 1));

    for (let i = 0; i < clipCount; i++) {
      const durationSec = durations[i % durations.length] ?? 30;
      const durationMs = durationSec * 1000;
      const start_ms = Math.min(step * (i + 1), maxMs - durationMs - 1000);
      const end_ms = Math.min(start_ms + durationMs, maxMs);

      const seg = transcript.segments.find(
        (s) => s.start * 1000 <= start_ms && s.end * 1000 >= start_ms,
      );

      const score = Math.min(96, 74 + i * 3);
      moments.push({
        start_ms: Math.max(0, start_ms),
        end_ms: Math.max(start_ms + 5000, end_ms),
        title: seg?.text.slice(0, 60) || `Viral moment ${i + 1}`,
        hook_text: seg?.text.slice(0, 120) || '',
        viral_score: score,
        metrics: {
          hook_strength: score - 5,
          engagement_prediction: score - 3,
          retention_prediction: score - 7,
          social_share_potential: score,
        },
      });
    }

    return moments;
  }

  private normalizeMoments(
    raw: ViralMoment[],
    videoDurationSec: number,
    clipCount: number,
    durations: number[],
  ): ViralMoment[] {
    const maxMs = videoDurationSec * 1000;
    const out: ViralMoment[] = [];

    for (let i = 0; i < Math.min(clipCount, raw.length); i++) {
      const m = raw[i];
      const durationSec = durations[i % durations.length] ?? 30;
      let start_ms = Math.max(0, Math.floor(m.start_ms ?? 0));
      let end_ms = Math.floor(m.end_ms ?? start_ms + durationSec * 1000);

      if (end_ms - start_ms < 5000) {
        end_ms = start_ms + durationSec * 1000;
      }
      if (end_ms > maxMs) {
        end_ms = maxMs;
        start_ms = Math.max(0, end_ms - durationSec * 1000);
      }

      const viral_score = Math.min(98, Math.max(70, Math.floor(m.viral_score ?? 80)));
      out.push({
        start_ms,
        end_ms,
        title: (m.title || `Clip ${i + 1}`).slice(0, 120),
        hook_text: (m.hook_text || m.title || '').slice(0, 200),
        viral_score,
        metrics: {
          hook_strength: m.metrics?.hook_strength ?? viral_score - 5,
          engagement_prediction: m.metrics?.engagement_prediction ?? viral_score - 3,
          retention_prediction: m.metrics?.retention_prediction ?? viral_score - 7,
          social_share_potential: m.metrics?.social_share_potential ?? viral_score,
        },
      });
    }

    if (out.length < clipCount) {
      return [
        ...out,
        ...this.heuristicMoments(
          { text: '', segments: [] },
          videoDurationSec,
          clipCount - out.length,
          durations,
        ),
      ];
    }

    return out;
  }
}

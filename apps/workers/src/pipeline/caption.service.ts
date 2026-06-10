import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import type { TranscriptSegment } from './types';

@Injectable()
export class CaptionService {
  /** Build SRT for a clip time range from full-video transcript segments. */
  async writeClipSrt(
    segments: TranscriptSegment[],
    clipStartMs: number,
    clipEndMs: number,
    outputPath: string,
    style: string,
  ): Promise<void> {
    const clipStart = clipStartMs / 1000;
    const clipEnd = clipEndMs / 1000;

    const inRange = segments.filter(
      (s) => s.end > clipStart && s.start < clipEnd,
    );

    const lines: string[] = [];
    let index = 1;

    for (const seg of inRange) {
      const relStart = Math.max(0, seg.start - clipStart);
      const relEnd = Math.min(clipEnd - clipStart, seg.end - clipStart);
      if (relEnd <= relStart) continue;

      let text = seg.text.trim();
      if (style === 'viral') {
        text = this.viralizeText(text);
      } else if (style === 'emoji') {
        text = this.addEmoji(text);
      }

      lines.push(String(index++));
      lines.push(`${this.formatSrtTime(relStart)} --> ${this.formatSrtTime(relEnd)}`);
      lines.push(text);
      lines.push('');
    }

    if (lines.length === 0) {
      lines.push('1');
      lines.push('00:00:00,000 --> 00:00:02,000');
      lines.push(style === 'viral' ? 'WATCH THIS' : '...');
      lines.push('');
    }

    await fs.writeFile(outputPath, lines.join('\n'), 'utf8');
  }

  private formatSrtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  private viralizeText(text: string): string {
    const words = text.split(/\s+/);
    if (words.length <= 4) return text.toUpperCase();
    const mid = Math.ceil(words.length / 2);
    return (
      words.slice(0, mid).join(' ').toUpperCase() +
      ' ' +
      words.slice(mid).join(' ')
    );
  }

  private addEmoji(text: string): string {
    if (/[!?]/.test(text)) return `🔥 ${text}`;
    if (/how|why|what/i.test(text)) return `🤔 ${text}`;
    return `✨ ${text}`;
  }
}

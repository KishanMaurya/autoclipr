import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { escapeFfmpegPath, runCommand } from './exec.util';
import { resolveBinary } from './resolve-binary.util';

const QUALITY_PRESETS: Record<string, { crf: string; scale: string }> = {
  hd: { crf: '23', scale: '1080:1920' },
  full_hd: { crf: '20', scale: '1080:1920' },
  '4k': { crf: '18', scale: '2160:3840' },
};

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private readonly ffmpeg: string;
  private readonly ffprobe: string;

  constructor(private readonly config: ConfigService) {
    this.ffmpeg = resolveBinary(this.config.get<string>('ffmpegPath'), 'ffmpeg');
    this.ffprobe = resolveBinary(this.config.get<string>('ffprobePath'), 'ffprobe');
    this.logger.log(`ffmpeg binary: ${this.ffmpeg}`);
  }

  async getDurationSeconds(videoPath: string): Promise<number> {
    const { stdout } = await runCommand(this.ffprobe, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ]);
    const sec = parseFloat(stdout.trim());
    if (!Number.isFinite(sec) || sec <= 0) {
      throw new Error('Could not read video duration');
    }
    return Math.round(sec);
  }

  async extractAudio(videoPath: string, audioPath: string): Promise<void> {
    this.logger.log(`Extracting audio → ${audioPath}`);
    await runCommand(this.ffmpeg, [
      '-y',
      '-i',
      videoPath,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-b:a',
      '64k',
      audioPath,
    ]);
  }

  async extractThumbnail(videoPath: string, thumbPath: string, atSeconds = 3): Promise<void> {
    await runCommand(this.ffmpeg, [
      '-y',
      '-ss',
      String(atSeconds),
      '-i',
      videoPath,
      '-vframes',
      '1',
      '-q:v',
      '2',
      thumbPath,
    ]);
  }

  async cutClip(
    videoPath: string,
    outputPath: string,
    startMs: number,
    endMs: number,
    exportQuality = 'hd',
  ): Promise<void> {
    const preset = QUALITY_PRESETS[exportQuality] ?? QUALITY_PRESETS.hd;
    const startSec = (startMs / 1000).toFixed(3);
    const durationSec = ((endMs - startMs) / 1000).toFixed(3);
    const [w, h] = preset.scale.split(':');

    const vf = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1`;

    this.logger.log(`Cutting clip ${startSec}s +${durationSec}s → ${outputPath}`);

    await runCommand(this.ffmpeg, [
      '-y',
      '-ss',
      startSec,
      '-i',
      videoPath,
      '-t',
      durationSec,
      '-vf',
      vf,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      preset.crf,
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      outputPath,
    ]);
  }

  async burnCaptions(
    inputPath: string,
    srtPath: string,
    outputPath: string,
    captionStyle: string,
  ): Promise<void> {
    const escaped = escapeFfmpegPath(srtPath);
    const style = this.subtitleForceStyle(captionStyle);
    const vf = `subtitles='${escaped}':force_style='${style}'`;

    await runCommand(this.ffmpeg, [
      '-y',
      '-i',
      inputPath,
      '-vf',
      vf,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      outputPath,
    ]);
  }

  private subtitleForceStyle(captionStyle: string): string {
    const base =
      'FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,Outline=2,Shadow=1,Alignment=2,MarginV=80';

    switch (captionStyle) {
      case 'karaoke':
        return `${base},Bold=1,FontSize=26`;
      case 'emoji':
        return `${base},FontSize=24`;
      case 'animated':
        return `${base},Bold=1,FontSize=24`;
      case 'viral':
      default:
        return `${base},Bold=1,FontSize=28`;
    }
  }
}

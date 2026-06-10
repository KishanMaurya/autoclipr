import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

/** Videos imported from a URL are processed locally; source is not stored in Supabase. */
export const URL_IMPORT_STORAGE_PREFIX = 'url-import:';

@Injectable()
export class WorkersStorageService {
  private readonly logger = new Logger(WorkersStorageService.name);
  private readonly client: SupabaseClient | null;
  private readonly maxUploadBytes: number;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('supabaseUrl');
    const key = this.config.get<string>('supabaseServiceKey');
    this.client =
      url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
    this.maxUploadBytes = this.config.get<number>('storageMaxUploadBytes') ?? 50 * 1024 * 1024;
  }

  isUrlImportPath(objectPath: string | undefined | null): boolean {
    return !!objectPath?.startsWith(URL_IMPORT_STORAGE_PREFIX);
  }

  urlImportPath(videoId: string): string {
    return `${URL_IMPORT_STORAGE_PREFIX}${videoId}`;
  }

  maxUploadBytesLimit(): number {
    return this.maxUploadBytes;
  }

  async getLocalFileSize(localPath: string): Promise<number> {
    const stat = await fs.stat(localPath);
    return stat.size;
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  objectPath(userId: string, folder: string, filename: string): string {
    return `${userId}/${folder}/${filename}`;
  }

  async downloadToFile(bucket: string, objectPath: string, localPath: string): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase storage not configured — cannot download source video');
    }

    const { data, error } = await this.client.storage.from(bucket).download(objectPath);
    if (error || !data) {
      throw new Error(`Storage download failed (${bucket}/${objectPath}): ${error?.message}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    await fs.writeFile(localPath, buffer);
  }

  async uploadLocalFile(
    bucket: string,
    objectPath: string,
    localPath: string,
    contentType: string,
    options?: { maxBytes?: number; label?: string },
  ): Promise<string> {
    if (!this.client) {
      this.logger.warn('Supabase not configured — skipping upload');
      return objectPath;
    }

    const maxBytes = options?.maxBytes ?? this.maxUploadBytes;
    const size = await this.getLocalFileSize(localPath);
    if (maxBytes > 0 && size > maxBytes) {
      const label = options?.label ?? path.basename(localPath);
      throw new Error(
        `${label} is ${this.formatBytes(size)} (Supabase free tier max ${this.formatBytes(maxBytes)} per file). ` +
          'Clips are exported at full quality — upgrade Supabase storage or use shorter clip durations.',
      );
    }

    const body = await fs.readFile(localPath);
    const { error } = await this.client.storage.from(bucket).upload(objectPath, body, {
      upsert: true,
      contentType,
    });

    if (error) {
      throw new Error(`Storage upload failed (${bucket}/${objectPath}): ${error.message}`);
    }

    return objectPath;
  }

  getPublicUrl(bucket: string, objectPath: string): string | null {
    if (!this.client) return null;
    const { data } = this.client.storage.from(bucket).getPublicUrl(objectPath);
    return data.publicUrl ?? null;
  }

  contentTypeForFile(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.srt': 'text/plain',
      '.vtt': 'text/vtt',
    };
    return map[ext] ?? 'application/octet-stream';
  }

  bucketVideos(): string {
    return this.config.get<string>('buckets.videos') ?? 'videos';
  }

  bucketClips(): string {
    return this.config.get<string>('buckets.clips') ?? 'clips';
  }

  bucketExports(): string {
    return this.config.get<string>('buckets.exports') ?? 'exports';
  }
}

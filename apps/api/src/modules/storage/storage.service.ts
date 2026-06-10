import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../../common/supabase-client';

@Injectable()
export class StorageService {
  private client: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('supabaseUrl');
    const key = this.config.get<string>('supabaseServiceKey');
    if (url && key) {
      this.client = createServerSupabaseClient(url, key);
    }
  }

  createUploadPath(userId: string, filename: string): string {
    return `${userId}/${Date.now()}_${filename}`;
  }

  async createSignedUploadUrl(
    objectPath: string,
    bucket: string,
  ): Promise<{ signedUrl: string; path: string }> {
    const url = this.config.get<string>('supabaseUrl');
    if (!this.client || !url) {
      return {
        signedUrl: `${url}/storage/v1/object/${bucket}/${objectPath}`,
        path: objectPath,
      };
    }

    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create signed upload URL');
    }

    return { signedUrl: data.signedUrl, path: objectPath };
  }

  clipsBucket(): string {
    return this.config.get<string>('buckets.clips') ?? 'clips';
  }

  clipThumbPath(clipStoragePath: string): string {
    if (!clipStoragePath) return '';
    if (/_thumb\.jpe?g$/i.test(clipStoragePath)) return clipStoragePath;
    return clipStoragePath.replace(/\.mp4$/i, '_thumb.jpg');
  }

  parseObjectPathFromUrl(
    url: string | null | undefined,
    bucket: string,
  ): string | null {
    if (!url) return null;

    const marker = `/storage/v1/object/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;

    let rest = url.slice(idx + marker.length);
    const query = rest.indexOf('?');
    if (query !== -1) rest = rest.slice(0, query);

    const parts = rest.split('/').filter(Boolean);
    if (parts[0] === 'public' || parts[0] === 'sign' || parts[0] === 'authenticated') {
      parts.shift();
    }
    if (parts[0] !== bucket) return null;
    parts.shift();

    return parts.length ? parts.join('/') : null;
  }

  async objectExists(bucket: string, objectPath: string): Promise<boolean> {
    if (!this.client || !objectPath) return false;

    const slash = objectPath.lastIndexOf('/');
    const dir = slash >= 0 ? objectPath.slice(0, slash) : '';
    const name = slash >= 0 ? objectPath.slice(slash + 1) : objectPath;

    const { data, error } = await this.client.storage
      .from(bucket)
      .list(dir, { search: name, limit: 1 });

    if (error || !data?.length) return false;
    return data.some((entry) => entry.name === name);
  }

  async createSignedDownloadUrl(
    bucket: string,
    objectPath: string,
    expiresInSeconds = 3600,
  ): Promise<string | null> {
    if (!this.client || !objectPath) return null;

    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresInSeconds);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }
}

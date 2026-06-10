import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChannelsRepository } from './channels.repository';
import { ConnectChannelDto } from './dto/connect-channel.dto';

export type ResolvedChannel = {
  channel_url: string;
  channel_name: string;
  thumbnail_url?: string;
};

@Injectable()
export class ChannelsService {
  constructor(private readonly channelsRepo: ChannelsRepository) {}

  list(userId: string) {
    return this.channelsRepo.listByUser(userId);
  }

  normalizeToYoutubeUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) throw new BadRequestException('Channel name or URL is required');

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
        throw new BadRequestException('URL must be a YouTube channel link');
      }
      return trimmed.split('?')[0].replace(/\/$/, '');
    }

    if (trimmed.startsWith('@')) {
      return `https://www.youtube.com/${trimmed}`;
    }

    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    }

    const handle = trimmed.replace(/^@/, '').replace(/\s+/g, '');
    return `https://www.youtube.com/@${handle}`;
  }

  async resolveChannel(query: string): Promise<ResolvedChannel> {
    const channelUrl = this.normalizeToYoutubeUrl(query);

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(channelUrl)}&format=json`;
      const res = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'AutoClipr/1.0' },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          author_name?: string;
          thumbnail_url?: string;
        };
        return {
          channel_url: channelUrl,
          channel_name: data.author_name ?? this.handleFromUrl(channelUrl),
          thumbnail_url: data.thumbnail_url,
        };
      }
    } catch {
      // fall through to handle-based resolution
    }

    const handle = this.handleFromUrl(channelUrl);
    if (!handle) {
      throw new BadRequestException(
        'Could not find that YouTube channel. Check the name and try again.',
      );
    }

    return {
      channel_url: channelUrl,
      channel_name: handle,
    };
  }

  private handleFromUrl(url: string): string {
    const match = url.match(/@([^/?]+)/);
    if (match) {
      return match[1].replace(/-/g, ' ');
    }
    const idMatch = url.match(/channel\/([^/?]+)/);
    if (idMatch) return `Channel ${idMatch[1].slice(0, 8)}`;
    return 'YouTube Channel';
  }

  async connect(userId: string, dto: ConnectChannelDto) {
    try {
      return await this.channelsRepo.create({
        user_id: userId,
        channel_url: dto.channel_url,
        channel_name: dto.channel_name,
        thumbnail_url: dto.thumbnail_url,
        is_trial_channel: dto.is_trial_channel ?? true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (
        message.includes('unique') ||
        message.includes('duplicate') ||
        message.includes('23505')
      ) {
        throw new BadRequestException('This channel is already connected');
      }
      throw err;
    }
  }

  async disconnect(userId: string, channelId: string) {
    const removed = await this.channelsRepo.delete(channelId, userId);
    if (!removed) throw new NotFoundException('Channel not found');
    return { removed: true };
  }
}

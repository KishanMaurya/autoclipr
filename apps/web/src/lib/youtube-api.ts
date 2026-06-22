const YT_KEY = process.env.YOUTUBE_API_KEY ?? '';
const BASE = 'https://www.googleapis.com/youtube/v3';

export type YTChannel = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  country: string;
  publishedAt: string;
  subscribers: string;
  views: string;
  videoCount: string;
  customUrl: string;
};

export type YTVideo = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: string;
  likes: string;
};

async function ytFetch(path: string) {
  const res = await fetch(`${BASE}${path}&key=${YT_KEY}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

export async function searchChannel(query: string): Promise<YTChannel | null> {
  if (!YT_KEY) return null;
  try {
    const search = await ytFetch(`/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(query)}`);
    const item = search.items?.[0];
    if (!item) return null;
    const channelId = item.id.channelId;
    return getChannelById(channelId);
  } catch {
    return null;
  }
}

export async function getChannelById(channelId: string): Promise<YTChannel | null> {
  if (!YT_KEY) return null;
  try {
    const data = await ytFetch(`/channels?part=snippet,statistics&id=${channelId}`);
    const ch = data.items?.[0];
    if (!ch) return null;
    return {
      id: ch.id,
      title: ch.snippet.title,
      description: ch.snippet.description,
      thumbnail: ch.snippet.thumbnails?.high?.url ?? ch.snippet.thumbnails?.default?.url ?? '',
      country: ch.snippet.country ?? '',
      publishedAt: ch.snippet.publishedAt,
      subscribers: ch.statistics.subscriberCount ?? '0',
      views: ch.statistics.viewCount ?? '0',
      videoCount: ch.statistics.videoCount ?? '0',
      customUrl: ch.snippet.customUrl ?? '',
    };
  } catch {
    return null;
  }
}

export async function getTopVideos(channelId: string): Promise<YTVideo[]> {
  if (!YT_KEY) return [];
  try {
    const search = await ytFetch(
      `/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=10`
    );
    const videoIds = (search.items ?? []).map((v: any) => v.id.videoId).filter(Boolean).join(',');
    if (!videoIds) return [];
    const details = await ytFetch(`/videos?part=statistics,snippet&id=${videoIds}`);
    return (details.items ?? []).map((v: any) => ({
      id: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails?.medium?.url ?? '',
      publishedAt: v.snippet.publishedAt,
      views: v.statistics.viewCount ?? '0',
      likes: v.statistics.likeCount ?? '0',
    }));
  } catch {
    return [];
  }
}

export function formatCount(n: string | number): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (isNaN(num)) return '—';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function estimateMonthlyEarnings(views: string): string {
  const v = parseInt(views, 10);
  if (isNaN(v)) return '$0';
  // CPM estimate ~$3
  const monthly = (v / 12 / 1000) * 3;
  if (monthly >= 1_000_000) return `$${(monthly / 1_000_000).toFixed(1)}M`;
  if (monthly >= 1_000) return `$${(monthly / 1_000).toFixed(0)}K`;
  return `$${monthly.toFixed(0)}`;
}

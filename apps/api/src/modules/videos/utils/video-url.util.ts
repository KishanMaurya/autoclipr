export type VideoSourceType =
  | 'youtube'
  | 'vimeo'
  | 'loom'
  | 'google_drive'
  | 'direct_mp4'
  | 'upload'
  | 'unknown';

export type ParsedVideoUrl = {
  sourceType: VideoSourceType;
  normalizedUrl: string;
  displayName: string;
  isSupported: boolean;
};

const SOURCE_LABELS: Record<VideoSourceType, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  loom: 'Loom',
  google_drive: 'Google Drive',
  direct_mp4: 'Direct MP4',
  upload: 'Uploaded Video',
  unknown: 'Unknown',
};

export function getSourceLabel(type: VideoSourceType): string {
  return SOURCE_LABELS[type] ?? 'Video';
}

export function parseVideoUrl(raw: string): ParsedVideoUrl {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      sourceType: 'unknown',
      normalizedUrl: '',
      displayName: 'Invalid URL',
      isSupported: false,
    };
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      sourceType: 'unknown',
      normalizedUrl: trimmed,
      displayName: 'Invalid URL',
      isSupported: false,
    };
  }

  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname.toLowerCase();

  if (
    host.includes('youtube.com') ||
    host === 'youtu.be' ||
    host.includes('youtube-nocookie.com')
  ) {
    return {
      sourceType: 'youtube',
      normalizedUrl: url.toString(),
      displayName: SOURCE_LABELS.youtube,
      isSupported: true,
    };
  }

  if (host.includes('vimeo.com')) {
    return {
      sourceType: 'vimeo',
      normalizedUrl: url.toString(),
      displayName: SOURCE_LABELS.vimeo,
      isSupported: true,
    };
  }

  if (host.includes('loom.com')) {
    return {
      sourceType: 'loom',
      normalizedUrl: url.toString(),
      displayName: SOURCE_LABELS.loom,
      isSupported: true,
    };
  }

  if (host.includes('drive.google.com') || host.includes('docs.google.com')) {
    return {
      sourceType: 'google_drive',
      normalizedUrl: url.toString(),
      displayName: SOURCE_LABELS.google_drive,
      isSupported: true,
    };
  }

  if (path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.webm')) {
    return {
      sourceType: 'direct_mp4',
      normalizedUrl: url.toString(),
      displayName: SOURCE_LABELS.direct_mp4,
      isSupported: true,
    };
  }

  return {
    sourceType: 'unknown',
    normalizedUrl: url.toString(),
    displayName: SOURCE_LABELS.unknown,
    isSupported: false,
  };
}

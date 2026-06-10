export type PipelineStep = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  checks?: string[];
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptResult = {
  text: string;
  segments: TranscriptSegment[];
  language?: string;
  /** True when Whisper was skipped (missing key, quota, etc.) */
  fallback?: boolean;
  fallback_reason?: string;
};

export type ViralMoment = {
  start_ms: number;
  end_ms: number;
  title: string;
  hook_text: string;
  viral_score: number;
  metrics: {
    hook_strength: number;
    engagement_prediction: number;
    retention_prediction: number;
    social_share_potential: number;
  };
};

export type UrlPipelinePayload = {
  video_id: string;
  source_url: string;
  source_type?: string;
  clip_count?: number;
  durations?: number[];
  caption_style?: string;
  caption_language?: string;
  platforms?: string[];
  export_quality?: string;
  auto_publish?: boolean;
};

export type ClipRenderResult = {
  clipId: string;
  storagePath: string;
  thumbnailPath: string | null;
  subtitlePath: string | null;
  publicClipUrl: string | null;
  publicThumbUrl: string | null;
};

import {
  beginApiLoading,
  endApiLoading,
} from "./api-loading-store";
import { shouldSkipGlobalApiLoader } from "./api-loading";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type APIResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page: number; limit: number; total: number; has_more: boolean };
};

export type ApiFetchOptions = RequestInit & {
  token?: string;
  /** Skip the global overlay loader for this request. */
  skipGlobalLoader?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<APIResponse<T>> {
  const { token, skipGlobalLoader, ...init } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const trackLoader =
    typeof window !== "undefined" &&
    !shouldSkipGlobalApiLoader(path, skipGlobalLoader);

  if (trackLoader) beginApiLoading();

  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, headers });
    return res.json();
  } finally {
    if (trackLoader) endApiLoading();
  }
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string | null;
  credits: number;
  subscription_tier: string;
  clip_credit_cost?: number;
}

export interface Video {
  id: string;
  title: string;
  status: string;
  storage_path: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  source_url?: string;
  source_type?: string;
  analysis?: Record<string, unknown>;
  created_at: string;
}

export interface ViralMetrics {
  hook_strength?: number;
  engagement_prediction?: number;
  retention_prediction?: number;
  social_share_potential?: number;
}

export interface Clip {
  id: string;
  video_id: string;
  title: string;
  status: string;
  start_time_ms: number;
  end_time_ms: number;
  thumbnail_url?: string | null;
  download_url?: string | null;
  ai_score?: number;
  viral_score?: number;
  duration_seconds?: number;
  caption_style?: string;
  caption_language?: string;
  platform_targets?: string[];
  export_quality?: string;
  viral_metrics?: ViralMetrics;
  aspect_ratio: string;
  created_at: string;
  publications?: ClipPublication[];
}

export interface ClipPublication {
  id: string;
  clip_id: string;
  platform: string;
  status: string;
  platform_post_id?: string | null;
  platform_post_url?: string | null;
  error_message?: string | null;
  posted_at?: string | null;
}

export interface PlatformConnection {
  id: string;
  platform: string;
  platform_label?: string;
  account_name?: string | null;
  auth_status: string;
  can_post?: boolean;
  has_tokens?: boolean;
  oauth_available?: boolean;
}

export interface VideoPipeline {
  video_id: string;
  title: string;
  status: string;
  source_url: string | null;
  source_type?: string;
  current_step: number | null;
  progress_percent: number;
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "active" | "completed" | "failed";
    checks?: string[];
  }>;
  clips_created: number;
  analysis?: Record<string, unknown>;
  job?: { id?: string; type?: string; status: string; error?: string };
}

export interface YoutubeChannel {
  id: string;
  channel_url: string;
  channel_name: string;
  thumbnail_url?: string;
  is_trial_channel: boolean;
  created_at: string;
}

export interface AnalyticsOverview {
  summary: {
    posted_count: number;
    failed_count: number;
    pending_count: number;
    total_views: number;
    total_likes: number;
    connected_platforms_count: number;
  };
  connected_platforms: Array<{
    platform: string;
    platform_label: string;
    account_name?: string | null;
    auth_status: string;
    can_post: boolean;
    metrics_supported: boolean;
  }>;
  by_platform: Record<
    string,
    { posted_count: number; total_views: number; total_likes: number }
  >;
  publications: Array<{
    id: string;
    clip_id: string;
    clip_title: string;
    platform: string;
    platform_label: string;
    platform_post_id?: string | null;
    platform_post_url?: string | null;
    posted_at?: string | null;
    view_count: number;
    like_count: number;
    comment_count: number;
    metrics_updated_at?: string | null;
    metrics_supported: boolean;
    thumbnail_url?: string | null;
  }>;
}

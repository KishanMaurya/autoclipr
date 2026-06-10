export const SUPPORTED_SOURCES = [
  { id: "youtube", label: "YouTube", color: "text-red-400" },
  { id: "vimeo", label: "Vimeo", color: "text-sky-400" },
  { id: "loom", label: "Loom", color: "text-violet-400" },
  { id: "google_drive", label: "Google Drive", color: "text-emerald-400" },
  { id: "direct_mp4", label: "Direct MP4", color: "text-amber-400" },
  { id: "upload", label: "Uploaded Video", color: "text-pink-400" },
] as const;

export const CAPTION_STYLES = [
  { id: "viral", label: "Viral Style" },
  { id: "animated", label: "Animated" },
  { id: "emoji", label: "Emoji Captions" },
  { id: "karaoke", label: "Karaoke" },
] as const;

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "ar", label: "Arabic" },
] as const;

export const DURATIONS = [15, 30, 45, 60] as const;

export const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube Shorts" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X (Twitter)" },
] as const;

export const EXPORT_QUALITIES = [
  { id: "hd", label: "HD 1080×1920" },
  { id: "full_hd", label: "Full HD" },
  { id: "4k", label: "4K" },
] as const;

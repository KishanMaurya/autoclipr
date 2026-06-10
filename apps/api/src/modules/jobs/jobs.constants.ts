export const CLIP_QUEUE = 'clip_processing';

export enum JobType {
  GENERATE_CLIPS = 'generate_clips',
  EXPORT_CLIP = 'export_clip',
  ANALYZE_VIDEO = 'analyze_video',
  URL_PIPELINE = 'url_pipeline',
  PUBLISH_CLIP = 'publish_clip',
}

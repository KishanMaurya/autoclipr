export type LogLevel = 'error' | 'warn' | 'info';

export type StructuredLogContext = {
  service?: string;
  traceId?: string;
  userId?: string;
  videoId?: string;
  jobId?: string;
  [key: string]: unknown;
};

/** W3C / New Relic distributed trace headers passed through BullMQ jobs. */
export type DistributedTraceHeaders = Record<string, string>;

export const NR_EVENTS = {
  VIDEO_UPLOAD_STARTED: 'VideoUploadStarted',
  VIDEO_PROCESSING_STARTED: 'VideoProcessingStarted',
  VIDEO_PROCESSING_COMPLETED: 'VideoProcessingCompleted',
  VIDEO_PROCESSING_FAILED: 'VideoProcessingFailed',
  HOOK_GENERATED: 'HookGenerated',
} as const;

export type CustomEventAttributes = Record<
  string,
  string | number | boolean | undefined
>;

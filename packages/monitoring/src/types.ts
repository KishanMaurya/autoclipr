export type LogLevel = 'error' | 'warn' | 'info';

export type StructuredLogContext = {
  service?: string;
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  userId?: string;
  videoId?: string;
  jobId?: string;
  [key: string]: unknown;
};

export type HttpLogDetails = {
  correlationId: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string;
  query?: string;
  requestBody?: string;
  responseBody?: string;
  errorMessage?: string;
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

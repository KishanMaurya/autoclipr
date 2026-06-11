/** BullMQ / ioredis options — fail fast when REDIS_URL is missing or wrong (Railway). */
export function bullMqConnectionOptions() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return {
    url,
    connectTimeout: 10_000,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}

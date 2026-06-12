/** Body logging defaults off in production; opt in with LOG_HTTP_BODIES=true. */
export function shouldLogHttpBodies(): boolean {
  const flag = process.env.LOG_HTTP_BODIES?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

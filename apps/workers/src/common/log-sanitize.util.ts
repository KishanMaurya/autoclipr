const SENSITIVE_KEY = /password|token|secret|authorization|api[_-]?key|credit|sk-|service[_-]?role/i;
const MAX_STRING = 2000;
const MAX_ARRAY = 30;

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[nested]';
  if (value == null) return value;

  if (typeof value === 'string') {
    if (/^sk-[a-zA-Z0-9_-]{8,}/.test(value)) return '[REDACTED_KEY]';
    if (value.length > MAX_STRING) return `${value.slice(0, MAX_STRING)}…[truncated]`;
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : sanitizeForLog(val, depth + 1);
    }
    return out;
  }

  return String(value);
}

export function formatForLog(value: unknown): string {
  return formatJsonForLog(value, { pretty: true });
}

export function formatJsonForLog(
  value: unknown,
  options?: { pretty?: boolean },
): string {
  if (value === undefined) return '';
  const sanitized = sanitizeForLog(value);
  const pretty = options?.pretty ?? true;
  try {
    const text = pretty
      ? JSON.stringify(sanitized, null, 2)
      : JSON.stringify(sanitized);
    const max = pretty ? 12_000 : MAX_STRING;
    return text.length > max ? `${text.slice(0, max)}…` : text;
  } catch {
    return String(value);
  }
}

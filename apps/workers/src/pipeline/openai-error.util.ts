import { APIConnectionError, APIError } from 'openai';

const OPENAI_HINT =
  'Verify OPENAI_API_KEY in .env, add billing at https://platform.openai.com/account/billing, and ensure api.openai.com is reachable (no firewall/VPN blocking).';

export function isQuotaOrBillingError(err: unknown): boolean {
  if (err instanceof APIError) {
    if (err.status === 402) return true;
    const code = (err.error as { code?: string } | undefined)?.code;
    if (code === 'insufficient_quota' || code === 'billing_not_active') return true;
    if (err.status === 429) {
      const msg = err.message.toLowerCase();
      if (/quota|billing|insufficient|exceeded your current/.test(msg)) return true;
    }
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (/insufficient_quota|exceeded your current quota|billing/.test(msg)) return true;
  }
  return false;
}

export function isRetryableOpenAiError(err: unknown): boolean {
  if (isQuotaOrBillingError(err)) return false;
  if (err instanceof APIConnectionError) return true;
  if (err instanceof APIError && (err.status === 408 || err.status === 429 || err.status >= 500)) {
    return true;
  }
  if (err instanceof Error) {
    return /connection error|timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|premature close/i.test(
      err.message,
    );
  }
  return false;
}

export function formatOpenAiError(
  service: string,
  err: unknown,
  extraHint?: string,
): Error {
  const base = err instanceof Error ? err.message : String(err);
  const hint = extraHint ? `${extraHint} ${OPENAI_HINT}` : OPENAI_HINT;

  if (base === 'Connection error.' || err instanceof APIConnectionError) {
    return new Error(`${service}: cannot reach OpenAI API. ${hint}`);
  }

  if (err instanceof APIError) {
    if (err.status === 401) {
      return new Error(`${service}: invalid OPENAI_API_KEY. ${OPENAI_HINT}`);
    }
    if (isQuotaOrBillingError(err)) {
      return new Error(
        `${service}: no OpenAI credits or billing not active. Add payment at https://platform.openai.com/account/billing (minimum ~$5). Free-tier keys cannot use Whisper.`,
      );
    }
    if (err.status === 429) {
      return new Error(
        `${service}: rate limited (too many requests). Wait 1–2 minutes and retry. ${OPENAI_HINT}`,
      );
    }
  }

  return new Error(`${service} failed: ${base}. ${hint}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

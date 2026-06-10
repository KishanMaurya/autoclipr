import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import WebSocket from 'ws';

let webSocketPatched = false;

/** Node 20 (Railway Docker) has no native WebSocket; Supabase realtime init requires one. */
function ensureWebSocket(): void {
  if (webSocketPatched || typeof globalThis.WebSocket !== 'undefined') return;
  (globalThis as typeof globalThis & { WebSocket: typeof WebSocket }).WebSocket =
    WebSocket as unknown as typeof globalThis.WebSocket;
  webSocketPatched = true;
}

export function createServerSupabaseClient(
  url: string,
  key: string,
  options?: SupabaseClientOptions<'public'>,
): SupabaseClient {
  ensureWebSocket();
  return createClient(url, key, {
    ...options,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      ...options?.auth,
    },
  });
}

import { createClient } from "@/lib/supabase/client";

/** Returns a valid Supabase access token, refreshing the session if needed. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  const { data } = await supabase.auth.refreshSession();
  return data.session?.access_token ?? null;
}

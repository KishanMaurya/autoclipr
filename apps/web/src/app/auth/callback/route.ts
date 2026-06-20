import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/setup/platforms";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const { session } = data;
      const meta = session.user.user_metadata ?? {};
      const fullName: string =
        meta.full_name ?? meta.name ?? "";
      const avatarUrl: string = meta.avatar_url ?? meta.picture ?? "";

      // Fire-and-forget sync so Google OAuth users get their profile upserted
      // and receive a welcome email on first sign-up (same as email/OTP flows).
      void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ full_name: fullName, avatar_url: avatarUrl, phone: "" }),
      }).catch(() => {
        // Non-fatal — dashboard will still load even if sync fails
      });

      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : `/${next}`}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

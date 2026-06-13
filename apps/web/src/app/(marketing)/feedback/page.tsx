import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { apiFetch, type Profile } from "@/lib/api";
import { resolveUserFullName } from "@/lib/user-avatar";
import { pageMetadata } from "@/lib/seo";
import { FeedbackForm } from "@/components/marketing/feedback-form";

export const metadata: Metadata = pageMetadata({
  title: "Feedback",
  description:
    "Share bugs, feature ideas, or general feedback about AutoClipr. We read every message.",
  path: "/feedback",
});

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let initialName = "";
  let initialEmail = session?.user.email ?? "";

  if (session?.access_token) {
    const profileRes = await apiFetch<Profile>("/api/v1/users/me", {
      token: session.access_token,
    });
    if (profileRes.data) {
      initialName =
        profileRes.data.full_name ??
        resolveUserFullName(session.user.user_metadata) ??
        "";
      initialEmail = profileRes.data.email || initialEmail;
    }
  }

  return (
    <div className="pt-16">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Feedback</h1>
          <p className="mt-4 text-muted-foreground">
            Help us improve AutoClipr — report bugs, request features, or share your experience.
          </p>
        </div>
        <FeedbackForm initialName={initialName} initialEmail={initialEmail} />
      </div>
    </div>
  );
}

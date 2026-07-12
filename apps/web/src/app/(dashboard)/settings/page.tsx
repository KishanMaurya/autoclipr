import { createClient } from "@/lib/supabase/server";
import { apiFetch, type Profile } from "@/lib/api";
import { resolveUserFullName } from "@/lib/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountSection } from "@/components/dashboard/delete-account-section";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { EmailNotificationsSection } from "@/components/dashboard/email-notifications-section";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const profileRes = await apiFetch<Profile>("/api/v1/users/me", {
    token: session!.access_token,
  });

  const profile = profileRes.data;
  const authUser = session!.user;
  const authEmail = authUser.email ?? profile?.email ?? "";
  const authPhone = authUser.phone ?? profile?.phone ?? null;
  const needsEmail = !authEmail;

  return (
    <div className="relative mx-auto max-w-2xl space-y-8">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-[380px] -translate-x-1/2 rounded-full bg-teal-500/[0.06] blur-3xl" aria-hidden />
      <div className="relative">
        <h1 className="text-2xl font-bold sm:text-3xl">
          <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Settings
          </span>
        </h1>
        <p className="text-muted-foreground">Manage your account and posting identity</p>
      </div>

      {needsEmail && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Add and verify your email below to enable Google/YouTube posting and account recovery.
        </div>
      )}

      <Card className="glass relative overflow-hidden border-white/[0.08]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            email={authEmail}
            fullName={
              profile?.full_name ??
              resolveUserFullName(authUser.user_metadata) ??
              ""
            }
            avatarUrl={profile?.avatar_url ?? authUser.user_metadata?.avatar_url ?? ""}
            phone={authPhone}
            emailEditable={needsEmail}
          />
        </CardContent>
      </Card>

      <Card className="glass relative overflow-hidden border-white/[0.08]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-500/0 via-sky-500/50 to-sky-500/0" />
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailNotificationsSection
            initialEnabled={profile?.email_notifications_enabled ?? true}
          />
        </CardContent>
      </Card>

      <Card className="glass relative overflow-hidden border-red-500/20">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
        <CardHeader>
          <CardTitle className="text-red-400">Delete account</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountSection />
        </CardContent>
      </Card>
    </div>
  );
}

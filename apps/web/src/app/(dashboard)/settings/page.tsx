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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your account and posting identity</p>
      </div>

      {needsEmail && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Add and verify your email below to enable Google/YouTube posting and account recovery.
        </div>
      )}

      <Card className="glass">
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

      <Card className="glass">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailNotificationsSection
            initialEnabled={profile?.email_notifications_enabled ?? true}
          />
        </CardContent>
      </Card>

      <Card className="glass border-red-500/20">
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

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({
  email: initialEmail,
  fullName: initialName,
  phone: initialPhone,
  emailEditable,
}: {
  email: string;
  fullName: string;
  phone?: string | null;
  emailEditable?: boolean;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    setInfo(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    const res = await apiFetch("/api/v1/users/me", {
      method: "PATCH",
      token,
      body: JSON.stringify({
        full_name: fullName.trim(),
        ...(emailEditable && email.trim() ? { email: email.trim() } : {}),
      }),
    });

    if (!res.success) {
      setError(res.error?.message ?? "Failed to save profile");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    });

    if (emailEditable && email.trim() && email.trim() !== initialEmail) {
      setInfo(
        "Profile saved. If you added a new email, check your inbox to verify it — required for YouTube posting.",
      );
    } else {
      setInfo("Profile saved.");
    }

    setSaved(true);
    setLoading(false);
    setTimeout(() => {
      setSaved(false);
      setInfo(null);
    }, 5000);
  }

  return (
    <div className="space-y-4">
      {initialPhone && (
        <div className="space-y-2">
          <Label>Mobile</Label>
          <Input value={initialPhone} disabled />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!emailEditable && !!initialEmail}
          placeholder={emailEditable ? "Add your email" : undefined}
        />
        {emailEditable && (
          <p className="text-xs text-muted-foreground">
            Add a verified email to connect Google/YouTube for posting clips.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {info}
        </p>
      )}

      <Button variant="gradient" onClick={save} disabled={loading}>
        {loading ? "Saving…" : saved ? "Saved!" : "Save changes"}
      </Button>
    </div>
  );
}

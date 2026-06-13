"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import {
  getUserAvatarFallback,
  getUserAvatarImageUrl,
  isEmojiAvatar,
} from "@/lib/user-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function SettingsForm({
  email: initialEmail,
  fullName: initialName,
  phone: initialPhone,
  avatarUrl: initialAvatarUrl,
  emailEditable,
}: {
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  emailEditable?: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const avatarImageUrl = getUserAvatarImageUrl(avatarUrl);
  const avatarFallback = getUserAvatarFallback({
    email: initialEmail,
    phone: initialPhone,
    fullName,
    avatarUrl,
  });

  async function persistAvatarUrl(nextUrl: string) {
    const token = await getAccessToken();
    if (!token) throw new Error("Session expired. Please sign in again.");

    const res = await apiFetch("/api/v1/users/me", {
      method: "PATCH",
      token,
      body: JSON.stringify({ avatar_url: nextUrl }),
    });

    if (!res.success) {
      throw new Error(res.error?.message ?? "Failed to save profile photo");
    }

    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { avatar_url: nextUrl || "" },
    });

    setAvatarUrl(nextUrl);
    router.refresh();
  }

  async function onAvatarSelected(file: File | null) {
    if (!file) return;

    setError(null);
    setInfo(null);

    if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("Profile photo must be 2 MB or smaller.");
      return;
    }

    setAvatarLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      const init = await apiFetch<{ upload_url: string; avatar_url: string }>(
        "/api/v1/users/me/avatar/upload",
        {
          method: "POST",
          token,
          body: JSON.stringify({
            filename: file.name,
            mime_type: file.type,
            size: file.size,
          }),
        },
      );

      if (!init.success || !init.data) {
        throw new Error(init.error?.message ?? "Failed to start upload");
      }

      const uploadRes = await fetch(init.data.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed. Please try again.");
      }

      const publicUrl = `${init.data.avatar_url}?t=${Date.now()}`;
      await persistAvatarUrl(publicUrl);
      setInfo("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setAvatarLoading(true);
    setError(null);
    setInfo(null);

    try {
      await persistAvatarUrl("");
      setInfo("Profile photo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove photo");
    } finally {
      setAvatarLoading(false);
    }
  }

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
    router.refresh();
    setTimeout(() => {
      setSaved(false);
      setInfo(null);
    }, 5000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 ring-2 ring-white/10">
          {avatarImageUrl && (
            <AvatarImage src={avatarImageUrl} alt="" referrerPolicy="no-referrer" />
          )}
          <AvatarFallback
            className={cn(
              "text-2xl",
              isEmojiAvatar(avatarFallback) ? "text-3xl" : "font-bold",
            )}
          >
            {avatarFallback}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <p className="text-sm font-medium">Profile photo</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, or WebP. Max 2 MB. Shows your initial if no photo is set.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={(e) => onAvatarSelected(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={avatarLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {avatarLoading ? "Uploading…" : "Upload photo"}
            </Button>
            {avatarImageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={avatarLoading}
                onClick={removeAvatar}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

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

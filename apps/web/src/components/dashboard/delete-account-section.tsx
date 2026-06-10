"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountSection() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText === "DELETE";

  async function deleteAccount() {
    if (!canDelete) return;

    setLoading(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    const res = await apiFetch<{ deleted: boolean }>("/api/v1/users/me", {
      method: "DELETE",
      token,
      body: JSON.stringify({ confirm: "DELETE" }),
    });

    if (!res.success) {
      setError(res.error?.message ?? "Failed to delete account.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Permanently delete your account, clips, videos, and connected platforms. This
        action cannot be undone.
      </p>

      <div className="space-y-2">
        <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
        <Input
          id="delete-confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="border-red-500/40 text-red-400 hover:border-red-500/60 hover:bg-red-950/40 hover:text-red-300"
        disabled={!canDelete || loading}
        onClick={deleteAccount}
      >
        {loading ? "Deleting…" : "Delete your account"}
      </Button>
    </div>
  );
}

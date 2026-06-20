"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  CreditCard,
  Mail,
  Scissors,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { getAccessToken } from "@/lib/auth-token";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const EMAIL_TYPES = [
  {
    icon: Mail,
    label: "Welcome & onboarding",
    description: "Account creation confirmation and getting-started tips.",
  },
  {
    icon: Scissors,
    label: "Clips ready",
    description: "Notified as soon as your AI clip generation completes.",
  },
  {
    icon: CreditCard,
    label: "Subscription & billing",
    description: "Purchase confirmations, invoices, and renewal reminders.",
  },
  {
    icon: TriangleAlert,
    label: "Trial expiry warnings",
    description: "3-day heads-up before your free trial ends.",
  },
  {
    icon: ShieldAlert,
    label: "Payment failures",
    description: "Alerts and retry reminders when a charge doesn't go through.",
  },
];

export function EmailNotificationsSection({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setEnabled(next);
    setSaving(true);
    setError(null);
    setSaved(false);

    const token = await getAccessToken();
    if (!token) {
      setError("Session expired — please sign in again.");
      setEnabled(!next);
      setSaving(false);
      return;
    }

    const res = await apiFetch("/api/v1/users/me", {
      method: "PATCH",
      token,
      body: JSON.stringify({ email_notifications_enabled: next }),
    });

    setSaving(false);

    if (!res.success) {
      setError(res.error?.message ?? "Failed to save preference.");
      setEnabled(!next);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-5">
      {/* Master toggle */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Bell className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <BellOff className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">Email notifications</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? "You will receive emails for the events below." : "All email notifications are paused."}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={() => void toggle(!enabled)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            enabled ? "bg-emerald-500" : "bg-white/10",
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
              enabled ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {/* List of email types */}
      <div
        className={cn(
          "space-y-2 transition-opacity",
          !enabled && "pointer-events-none opacity-40",
        )}
      >
        {EMAIL_TYPES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <CheckCircle2
                className={cn(
                  "ml-auto mt-0.5 h-4 w-4 shrink-0",
                  enabled ? "text-emerald-400" : "text-white/20",
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Feedback */}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          Notification preference saved.
        </p>
      )}
      {saving && (
        <p className="text-sm text-muted-foreground">Saving…</p>
      )}
    </div>
  );
}

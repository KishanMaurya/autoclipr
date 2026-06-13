"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "billing", label: "Billing & account" },
  { value: "other", label: "Other" },
] as const;

type FeedbackFormProps = {
  initialName?: string;
  initialEmail?: string;
};

export function FeedbackForm({ initialName = "", initialEmail = "" }: FeedbackFormProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = await getAccessToken().catch(() => null);

    const res = await apiFetch<{ id: string }>("/api/v1/feedback", {
      method: "POST",
      token: token ?? undefined,
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        category,
        message: message.trim(),
        page_url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error?.message ?? "Could not send feedback. Please try again.");
      return;
    }

    setSubmitted(true);
    setMessage("");
  }

  if (submitted) {
    return (
      <div className="glass-panel flex flex-col items-center gap-4 px-6 py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <h2 className="text-xl font-semibold">Thanks for your feedback</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We received your message and will review it soon. For urgent issues, email{" "}
          <a href="mailto:hello@autoclipr.ai" className="text-emerald-300 hover:underline">
            hello@autoclipr.ai
          </a>
          .
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel space-y-5 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
          <MessageSquare className="h-5 w-5 text-emerald-400" />
        </span>
        <div>
          <h2 className="font-semibold">Tell us what you think</h2>
          <p className="text-sm text-muted-foreground">
            Bugs, ideas, or anything we can improve.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="feedback-name">Name</Label>
          <Input
            id="feedback-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="feedback-email">Email</Label>
          <Input
            id="feedback-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-category">Category</Label>
        <select
          id="feedback-category"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as (typeof CATEGORIES)[number]["value"])
          }
          className={cn(
            "flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-foreground",
            "focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/25",
          )}
        >
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value} className="bg-[#0a1628]">
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-message">Message</Label>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          placeholder="Describe your feedback in detail…"
          className={cn(
            "flex w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-foreground",
            "placeholder:text-muted-foreground focus-visible:border-emerald-500/40 focus-visible:bg-white/[0.06]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/25",
          )}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" variant="gradient" disabled={loading} className="w-full sm:w-auto">
        {loading ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}

"use client";

import { useId, useState } from "react";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { CONTACT_EMAIL } from "@/lib/legal-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FeedbackCategory = "general" | "bug" | "feature" | "billing" | "other";

type CategoryOption = { value: FeedbackCategory; label: string };

const FEEDBACK_CATEGORIES: CategoryOption[] = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "billing", label: "Billing & account" },
  { value: "other", label: "Other" },
];

const CONTACT_CATEGORIES: CategoryOption[] = [
  { value: "general", label: "General inquiry" },
  { value: "billing", label: "Billing & subscriptions" },
  { value: "bug", label: "Technical support" },
  { value: "feature", label: "Sales & partnerships" },
  { value: "other", label: "Other" },
];

const VARIANTS = {
  feedback: {
    title: "Tell us what you think",
    subtitle: "Bugs, ideas, or anything we can improve.",
    successTitle: "Thanks for your feedback",
    successBody:
      "We received your message and will review it soon. For urgent issues, email us directly.",
    submitLabel: "Send feedback",
    messagePlaceholder: "Describe your feedback in detail…",
    categories: FEEDBACK_CATEGORIES,
    defaultCategory: "general" as FeedbackCategory,
  },
  contact: {
    title: "Send us a message",
    subtitle: "Questions about your account, billing, or the product.",
    successTitle: "Message sent",
    successBody:
      "Thanks for reaching out. We typically respond within 1–2 business days.",
    submitLabel: "Send message",
    messagePlaceholder: "How can we help you?",
    categories: CONTACT_CATEGORIES,
    defaultCategory: "general" as FeedbackCategory,
  },
};

type FeedbackFormProps = {
  initialName?: string;
  initialEmail?: string;
  variant?: keyof typeof VARIANTS;
};

export function FeedbackForm({
  initialName = "",
  initialEmail = "",
  variant = "feedback",
}: FeedbackFormProps) {
  const config = VARIANTS[variant];
  const formId = useId();

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [category, setCategory] = useState<FeedbackCategory>(config.defaultCategory);
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
      setError(res.error?.message ?? "Could not send your message. Please try again.");
      return;
    }

    setSubmitted(true);
    setMessage("");
  }

  if (submitted) {
    return (
      <div className="glass-panel flex flex-col items-center gap-4 px-6 py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <h2 className="text-xl font-semibold">{config.successTitle}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {config.successBody} For urgent issues, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-300 hover:underline">
            {CONTACT_EMAIL}
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
          <h2 className="font-semibold">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-name`}>Name</Label>
          <Input
            id={`${formId}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-email`}>Email</Label>
          <Input
            id={`${formId}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-category`}>Topic</Label>
        <select
          id={`${formId}-category`}
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          className={cn(
            "flex h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-foreground",
            "focus-visible:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/25",
          )}
        >
          {config.categories.map((item) => (
            <option key={item.value} value={item.value} className="bg-[#0a1628]">
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-message`}>Message</Label>
        <textarea
          id={`${formId}-message`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          placeholder={config.messagePlaceholder}
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
        {loading ? "Sending…" : config.submitLabel}
      </Button>
    </form>
  );
}

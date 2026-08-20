"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await apiFetch<{ subscribed: boolean }>("/api/v1/newsletter/subscribe", {
        method: "POST",
        skipGlobalLoader: true,
        body: JSON.stringify({
          email,
          source: "footer",
          page_url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      if (res.success) {
        setStatus("done");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(res.error?.message ?? "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2.5">
        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-sm text-emerald-300">You&apos;re subscribed. Watch your inbox.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? "newsletter-error" : undefined}
          className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-emerald-500/40"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          aria-label="Subscribe to the newsletter"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {status === "error" && (
        <p id="newsletter-error" role="alert" className="mt-2 text-xs text-rose-400">
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Clip tips and product updates. Unsubscribe anytime.
      </p>
    </form>
  );
}

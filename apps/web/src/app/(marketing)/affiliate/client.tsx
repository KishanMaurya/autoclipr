"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, DollarSign, Copy, Check } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const EASE = [0.22, 1, 0.36, 1] as const;

const FAQS = [
  {
    q: "When do I get paid?",
    a: "Payouts are processed on the 1st of every month via PayPal or bank transfer. You need a minimum balance of $50 to trigger a payout.",
  },
  {
    q: "How long does the cookie last?",
    a: "90 days. If someone clicks your link and subscribes any time within 90 days, you earn the commission.",
  },
  {
    q: "Is there a limit on how much I can earn?",
    a: "No cap. Top affiliates earn $2,000–$5,000/month. The more creators you refer, the more you earn — recurring, every month.",
  },
  {
    q: "What counts as a valid referral?",
    a: "Any user who signs up via your unique link and upgrades to a paid plan within 90 days. Free plan signups don't count toward commissions.",
  },
  {
    q: "Can I promote AutoClipr on YouTube, TikTok, or a blog?",
    a: "Absolutely. We encourage video reviews, tutorials, comparison posts, and social content. We'll even send you a Pro account to record demos.",
  },
  {
    q: "Do you provide marketing materials?",
    a: "Yes — banners, demo videos, email swipe copy, and a dedicated affiliate manager are all included when you join.",
  },
];

const TIERS = [
  { name: "Starter", sales: "1–5 sales/mo", commission: "30%", color: "from-white/10 to-white/5", badge: null },
  { name: "Growth",  sales: "6–20 sales/mo", commission: "35%", color: "from-emerald-500/20 to-teal-500/10", badge: "Popular" },
  { name: "Elite",   sales: "21+ sales/mo",  commission: "40%", color: "from-violet-500/20 to-purple-500/10", badge: "Best" },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group border-b border-white/[0.06]"
    >
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="text-sm font-medium text-white/70 transition-colors group-hover:text-white">{q}</span>
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] transition-all ${open ? "rotate-180 border-emerald-500/30 bg-emerald-500/10" : ""}`}>
          <ChevronDown className={`h-3.5 w-3.5 ${open ? "text-emerald-400" : "text-white/40"}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/45">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function EarningsCalculator() {
  const [referrals, setReferrals] = useState(10);
  const avgPlan = 29; // $29/mo avg plan price
  const commission = 0.30;
  const monthly = Math.round(referrals * avgPlan * commission);
  const yearly = monthly * 12;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a16] p-8"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-64 -translate-x-1/2 rounded-full bg-emerald-500/6 blur-3xl" />

      <div className="relative">
        <h3 className="mb-1 text-lg font-bold text-white">Earnings calculator</h3>
        <p className="mb-8 text-sm text-white/40">Drag to estimate your monthly commission</p>

        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-white/50">Referrals per month</span>
            <span className="text-lg font-bold text-white">{referrals} creators</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={referrals}
            onChange={(e) => setReferrals(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
          />
          <div className="mt-1.5 flex justify-between text-[10px] text-white/20">
            <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400/70">Monthly</p>
            <p className="text-3xl font-black text-emerald-400">${monthly.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-400/70">Yearly</p>
            <p className="text-3xl font-black text-violet-400">${yearly.toLocaleString()}</p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/25">
          Based on avg. $29/mo plan · 30% commission · recurring monthly
        </p>
      </div>
    </motion.div>
  );
}

export function CommissionTiers() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {TIERS.map((tier, i) => (
        <motion.div
          key={tier.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: EASE }}
          className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br ${tier.color} p-6 text-center`}
        >
          {tier.badge && (
            <span className="absolute right-3 top-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              {tier.badge}
            </span>
          )}
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/40">{tier.name}</p>
          <p className="text-4xl font-black text-white">{tier.commission}</p>
          <p className="mt-1 text-xs text-white/30">commission</p>
          <p className="mt-3 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/50">
            {tier.sales}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

export function AffiliateSignupForm() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !channel) return;
    setLoading(true);
    setError("");
    try {
      await fetch(`${API_URL}/api/v1/affiliates/inquire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, channelUrl: channel }),
      });
    } catch {
      // Still show success — email sending is best-effort
    }
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
          <Check className="h-7 w-7 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Application received!</h3>
        <p className="mt-2 text-sm text-white/50">
          We review applications within 24–48 hours. Check your inbox at <span className="text-emerald-400">{email}</span> for your affiliate link.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-white/50">Your email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-emerald-500/40 focus:bg-white/[0.06]"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-white/50">YouTube / TikTok / Blog URL</label>
        <input
          type="url"
          required
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="https://youtube.com/@yourchannel"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-emerald-500/40 focus:bg-white/[0.06]"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="group w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(16,185,129,0.25)] transition-all hover:scale-[1.01] hover:shadow-[0_0_28px_rgba(16,185,129,0.4)] disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Apply to become an affiliate"}
      </button>
      <p className="text-center text-xs text-white/25">Free to join · Approved within 48 hours</p>
    </form>
  );
}

export function FaqSection() {
  return (
    <div>
      {FAQS.map((faq, i) => (
        <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
      ))}
    </div>
  );
}

export function CopyLink() {
  const [copied, setCopied] = useState(false);
  const link = "https://autoclipr.com/?ref=your_code";

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <code className="flex-1 truncate text-xs text-white/40">{link}</code>
      <button onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/60 transition-all hover:bg-white/[0.1] hover:text-white">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

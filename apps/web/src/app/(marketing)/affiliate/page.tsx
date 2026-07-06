import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { DollarSign, Users, RefreshCw, BarChart3, Gift, Headphones, Star, TrendingUp, Zap, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { apiFetch } from "@/lib/api";
import {
  EarningsCalculator,
  CommissionTiers,
  AffiliateSignupForm,
  FaqSection,
  CopyLink,
} from "./client";

export const metadata: Metadata = pageMetadata({
  title: "Affiliate Program — Earn 30% Recurring Commission",
  description:
    "Earn 30–40% recurring commission for every creator you refer to AutoClipr. 90-day cookie, real-time dashboard, no cap on earnings. Join free.",
  path: "/affiliate",
  keywords: [
    "autoclipr affiliate", "video tool affiliate program", "recurring commission affiliate",
    "creator affiliate program", "saas affiliate", "refer and earn", "affiliate marketing",
  ],
});

const PERKS = [
  { icon: DollarSign, title: "30–40% recurring", desc: "Earn commission every month for as long as your referral stays subscribed.", color: "from-emerald-500 to-teal-400" },
  { icon: RefreshCw,  title: "90-day cookie",    desc: "Long attribution window — you get credit even if they convert weeks later.", color: "from-blue-500 to-cyan-400" },
  { icon: BarChart3,  title: "Real-time dashboard", desc: "Track clicks, signups, and commissions live in your affiliate portal.", color: "from-violet-500 to-purple-400" },
  { icon: Gift,       title: "Free Pro account",  desc: "Every approved affiliate gets a free Pro account to create demos.", color: "from-orange-500 to-rose-400" },
  { icon: Headphones, title: "Dedicated manager", desc: "A dedicated affiliate manager to help you maximise your earnings.", color: "from-pink-500 to-rose-400" },
  { icon: Users,      title: "No referral cap",   desc: "Refer 1 creator or 1,000 — there is no ceiling on what you can earn.", color: "from-amber-500 to-yellow-400" },
];

const STEPS = [
  { n: "01", title: "Apply", desc: "Submit your application with your channel or blog URL. We approve within 48 hours." },
  { n: "02", title: "Get your link", desc: "Receive your unique affiliate link and access to our creative assets library." },
  { n: "03", title: "Promote", desc: "Share AutoClipr with your audience through videos, blogs, newsletters, or socials." },
  { n: "04", title: "Earn", desc: "Get paid 30–40% recurring commission every month. Withdraw via PayPal or bank transfer." },
];

const SOCIAL_PROOF = [
  { name: "James K.", handle: "@jamesgrowth", earning: "$1,840/mo", quote: "I mentioned AutoClipr in one YouTube video and now I have 63 active referrals paying me every single month.", avatar: "JK" },
  { name: "Maria T.", handle: "@mariacreates", earning: "$920/mo", quote: "The 90-day cookie is what sold me on promoting this. Took 3 months to see income but now it's completely passive.", avatar: "MT" },
  { name: "Dev P.",  handle: "@devbuilds",    earning: "$3,200/mo", quote: "I run a newsletter for video creators. AutoClipr converts insanely well — best affiliate program I promote.", avatar: "DP" },
];

export default async function AffiliatePage() {
  // Try to get the logged-in user's ref code to show on the page
  let userRefCode: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const res = await apiFetch<{ affiliate: { ref_code: string } }>("/api/v1/affiliates/me", {
        token: session.access_token,
        cache: "no-store",
      });
      if (res.success && res.data?.affiliate?.ref_code) {
        userRefCode = res.data.affiliate.ref_code;
      }
    }
  } catch {
    // Not logged in or no affiliate account — show placeholder
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/7 blur-[120px]" />
          <div className="absolute left-1/4 top-1/2 h-64 w-64 rounded-full bg-violet-500/5 blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="mx-auto max-w-3xl">
          <span className="section-label mx-auto mb-6 inline-flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5" />
            Affiliate Program
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Earn{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              30% recurring
            </span>
            <br />for every referral
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/45">
            Refer creators to AutoClipr and earn commission every month they stay subscribed — no cap, no expiry.
          </p>

          {/* Key numbers */}
          <div className="mt-12 flex flex-wrap justify-center gap-10 sm:gap-16">
            {[
              { value: "30–40%", label: "Recurring commission" },
              { value: "90 days", label: "Cookie window" },
              { value: "$0", label: "To join" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-white/30">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <a
              href="#apply"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-8 py-4 text-sm font-bold text-white shadow-[0_0_24px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_36px_rgba(16,185,129,0.45)]"
            >
              Join the affiliate program — it&apos;s free
              <TrendingUp className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Perks grid ────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="section-label mb-4 inline-flex items-center gap-2">
              <Gift className="h-3.5 w-3.5" />
              Why promote AutoClipr
            </span>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                earn more
              </span>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((perk, i) => (
              <div
                key={perk.title}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a16] p-6 transition-all hover:border-white/[0.14]"
              >
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${perk.color} opacity-0 transition-opacity group-hover:opacity-60`} />
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${perk.color}`}>
                  <perk.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-1.5 font-bold text-white">{perk.title}</h3>
                <p className="text-sm leading-relaxed text-white/45">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission tiers + Calculator ─────────────────────────────── */}
      <section className="border-y border-white/[0.05] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Commission{" "}
              <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                tiers
              </span>
            </h2>
            <p className="mt-3 text-white/40">Higher volume = higher commission rate, automatically.</p>
          </div>

          <CommissionTiers />

          <div className="mt-10">
            <EarningsCalculator />
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <span className="section-label mb-4 inline-flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              How it works
            </span>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Start earning in{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                4 steps
              </span>
            </h2>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-6 top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-emerald-500/40 via-white/10 to-transparent sm:block" />
            <div className="space-y-6">
              {STEPS.map((step, i) => (
                <div key={step.n} className="relative flex gap-6 rounded-2xl border border-white/[0.07] bg-[#0a0a16] p-6 sm:pl-8">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-sm font-black text-white shadow-[0_0_16px_rgba(16,185,129,0.25)]">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/45">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof ──────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/25">
            What our affiliates are saying
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {SOCIAL_PROOF.map((p, i) => (
              <div key={p.name} className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a16] p-6 transition-all hover:border-white/[0.14]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 text-xs font-bold text-white">
                    {p.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-xs text-white/35">{p.handle}</p>
                  </div>
                  <div className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                    {p.earning}
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-white/55">&ldquo;{p.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Apply form ────────────────────────────────────────────────── */}
      <section id="apply" className="border-t border-white/[0.05] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="section-label mb-5 inline-flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                Apply now
              </span>
              <h2 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl">
                Ready to start earning?
              </h2>
              <p className="mb-8 text-white/45">
                Join our affiliate program for free. No approval delay — we review applications within 48 hours and send your unique link immediately.
              </p>
              <div className="space-y-4 text-sm text-white/50">
                {[
                  "Free to join — no hidden costs",
                  "30–40% recurring monthly commission",
                  "90-day cookie attribution window",
                  "Real-time dashboard & analytics",
                  "Free Pro account for approved affiliates",
                  "Monthly payouts via PayPal or bank",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <p className="mb-2 text-xs font-semibold text-white/30">Your referral link will look like</p>
                <CopyLink refCode={userRefCode} />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a16] p-7">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-56 -translate-x-1/2 rounded-full bg-emerald-500/6 blur-3xl" />
              <div className="relative">
                <h3 className="mb-6 text-lg font-bold text-white">Apply to become an affiliate</h3>
                <AffiliateSignupForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-white">
            Frequently asked{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              questions
            </span>
          </h2>
          <FaqSection />
        </div>
      </section>

    </div>
  );
}

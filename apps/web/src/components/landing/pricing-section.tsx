"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { type CurrencyCode, PLAN_PRICES, formatPrice, CURRENCY_SYMBOLS } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Rocket,
  Aperture,
  Briefcase,
  PlaySquare,
  Coins,
  Zap,
  Subtitles,
  Sparkles,
  LayoutGrid,
  Flame,
  Award,
  Upload,
  Users,
  LineChart,
  Layers,
  Check,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, MotionCard } from "@/components/ui/motion";

type PlanFeature = {
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  priceYearly?: number;
  tagline: string;
  icon: LucideIcon;
  iconClass: string;
  accentColor: string;
  badgeText?: string;
  features: PlanFeature[];
  cta: string;
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    priceYearly: 0,
    tagline: "Perfect for solo creators getting started.",
    icon: Rocket,
    iconClass: "from-violet-500 to-pink-500",
    accentColor: "violet",
    cta: "Get started free",
    features: [
      { label: "20 short clips / month", icon: PlaySquare },
      { label: "100 credits included", icon: Coins },
      { label: "Fast mode up to 60s", icon: Zap },
      { label: "AI viral moment detection", icon: Sparkles },
      { label: "Auto captions & subtitles", icon: Subtitles },
      { label: "Niche-specific templates", icon: LayoutGrid },
      { label: "TikTok, Reels & Shorts export", icon: PlaySquare },
      { label: "Unlimited exports", icon: Upload },
    ],
  },
  {
    id: "creator",
    name: "Creator",
    price: 399,
    priceYearly: 399,
    tagline: "For creators who publish daily and grow fast.",
    icon: Aperture,
    iconClass: "from-emerald-500 to-cyan-400",
    accentColor: "emerald",
    cta: "Get started",
    popular: true,
    badgeText: "Most Popular",
    features: [
      { label: "90 short clips / month", icon: PlaySquare, highlight: true },
      { label: "500 credits included", icon: Coins, highlight: true },
      { label: "Fast + Pro rendering modes", icon: Zap },
      { label: "AI clip scoring & highlights", icon: Sparkles, highlight: true },
      { label: "Short-form video templates", icon: Flame },
      { label: "Auto captions & subtitles", icon: Subtitles },
      { label: "Brand kits", icon: Award },
      { label: "Priority exports + faster queue", icon: Upload, highlight: true },
      { label: "Multi-platform publishing", icon: PlaySquare },
      { label: "Unlimited exports", icon: Upload },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 1999,
    priceYearly: 1999,
    tagline: "For agencies, teams, and serious power users.",
    icon: Briefcase,
    iconClass: "from-orange-500 to-amber-400",
    accentColor: "orange",
    cta: "Get started",
    features: [
      { label: "200 short clips / month", icon: PlaySquare, highlight: true },
      { label: "1,200 credits included", icon: Coins, highlight: true },
      { label: "All rendering modes unlocked", icon: Zap },
      { label: "AI Shorts creator", icon: Sparkles },
      { label: "Auto captions & subtitles", icon: Subtitles },
      { label: "Team access + commercial rights", icon: Users, highlight: true },
      { label: "Priority rendering queue", icon: Upload },
      { label: "Advanced brand kits", icon: Award },
      { label: "Bulk video creation", icon: Layers, highlight: true },
      { label: "Analytics & performance tracking", icon: LineChart },
      { label: "Unlimited exports", icon: Upload },
    ],
  },
];

const accentMap: Record<string, { badge: string; icon: string; ring: string; glow: string; btn: string; feature: string }> = {
  violet: {
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/20",
    icon: "from-violet-500 to-pink-500",
    ring: "border-violet-500/30 shadow-violet-500/10",
    glow: "bg-violet-400",
    btn: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    feature: "text-violet-400",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    icon: "from-emerald-500 to-cyan-400",
    ring: "border-emerald-500/40 shadow-emerald-500/15",
    glow: "bg-emerald-400",
    btn: "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-500 hover:to-emerald-400",
    feature: "text-emerald-400",
  },
  orange: {
    badge: "bg-orange-500/15 text-orange-300 border-orange-500/20",
    icon: "from-orange-500 to-amber-400",
    ring: "border-orange-500/30 shadow-orange-500/10",
    glow: "bg-orange-400",
    btn: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    feature: "text-orange-400",
  },
};

function PricingCard({ plan, yearly, currency }: { plan: Plan; yearly: boolean; currency: CurrencyCode }) {
  const Icon = plan.icon;
  const ac = accentMap[plan.accentColor];
  const planPrices = PLAN_PRICES[plan.id]?.[currency];
  const displayPrice = yearly ? (planPrices?.yearly ?? 0) : (planPrices?.monthly ?? 0);
  const priceLabel = formatPrice(displayPrice, currency);
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    if (plan.id === "starter") {
      window.location.href = "/register";
      return;
    }
    setLoading(true);
    try {
      // Check if user is logged in
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in — redirect to login, then back to pricing to trigger checkout
        window.location.href = `/login?redirect=/pricing?checkout=${plan.id}&billing=${yearly ? "yearly" : "monthly"}`;
        return;
      }

      // Logged in — call checkout API
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId: plan.id, billingPeriod: yearly ? "yearly" : "monthly" }),
      });
      const data = await res.json();
      if (data?.data?.url) {
        window.location.href = data.data.url;
      } else {
        alert("Could not start checkout. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MotionCard
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl border bg-[#0d0d18] transition-all duration-300",
        plan.popular
          ? cn("border-emerald-500/40 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500/20 scale-[1.02]", "lg:scale-[1.04]")
          : "border-white/[0.08] hover:border-white/20"
      )}
    >
      {/* Popular badge */}
      {plan.badgeText && (
        <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-xs font-bold uppercase tracking-widest text-white">
          <Sparkles className="h-3 w-3" />
          {plan.badgeText}
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden px-7 pb-7 pt-8">
        {/* Subtle grid bg */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        {/* Glow dot */}
        <span className={cn("absolute right-6 top-6 h-2 w-2 rounded-full blur-sm opacity-90", ac.glow)} />

        {/* Icon */}
        <div className={cn("relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg", ac.icon)}>
          <Icon className="h-7 w-7 text-white" strokeWidth={1.75} />
        </div>

        {/* Plan name + tagline */}
        <div className="relative mt-5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
            {plan.badgeText && (
              <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", ac.badge)}>
                Best value
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{plan.tagline}</p>
        </div>

        {/* Price */}
        <div className="relative mt-5">
          <div className="flex items-end gap-1">
            <span className="text-5xl font-extrabold tracking-tight text-white">{priceLabel}</span>
            {displayPrice > 0 && <span className="mb-2 text-sm text-muted-foreground">/month</span>}
          </div>
          {/* Yearly total + discount */}
          {yearly && displayPrice > 0 && (() => {
            const monthlyPrice = planPrices?.monthly ?? 0;
            const yearlyTotal = displayPrice * 12;
            const savings = (monthlyPrice - displayPrice) * 12;
            const discountPct = Math.round((savings / (monthlyPrice * 12)) * 100);
            const sym = CURRENCY_SYMBOLS[currency];
            return (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xs text-white/40">
                  {sym}{yearlyTotal.toLocaleString()} billed yearly
                </p>
                {discountPct > 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    Save {discountPct}%
                  </span>
                )}
              </div>
            );
          })()}
          {(!yearly || displayPrice === 0) && (
            <p className="mt-1 text-xs text-white/30">
              {displayPrice === 0 ? "Free forever" : "Billed monthly · Cancel anytime"}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-7 h-px bg-white/[0.06]" />

      {/* Features */}
      <div className="flex flex-1 flex-col px-7 py-6">
        <p className="mb-5 text-[10px] font-bold uppercase tracking-widest text-white/30">
          What&apos;s included
        </p>
        <ul className="space-y-3">
          {plan.features.map((feature) => {
            return (
              <li key={feature.label} className="flex items-center gap-3 text-sm">
                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  feature.highlight ? `bg-gradient-to-br ${ac.icon} shadow-sm` : "bg-white/[0.06]"
                )}>
                  <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                </div>
                <span className={cn("leading-snug", feature.highlight ? "font-medium text-white" : "text-white/60")}>
                  {feature.label}
                </span>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <div className="mt-8">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className={cn(
              "flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed",
              ac.btn
            )}
          >
            {loading ? "Redirecting..." : plan.cta}
          </button>
        </div>
      </div>
    </MotionCard>
  );
}

type PricingSectionProps = {
  showHeader?: boolean;
};

export function PricingSection({ showHeader = true }: PricingSectionProps) {
  const [yearly, setYearly] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [country, setCountry] = useState<string>("");
  const searchParams = useSearchParams();
  const autoCheckoutTriggered = useRef(false);

  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data) => {
        if (data?.currency?.code) setCurrency(data.currency.code as CurrencyCode);
        if (data?.country) setCountry(data.country);
      })
      .catch(() => {});
  }, []);

  // After login redirect: auto-trigger checkout if ?checkout=planId is in URL
  useEffect(() => {
    const checkoutPlan = searchParams?.get("checkout");
    if (!checkoutPlan || autoCheckoutTriggered.current) return;

    async function triggerAutoCheckout() {
      autoCheckoutTriggered.current = true;
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ planId: checkoutPlan, billingPeriod: searchParams?.get("billing") ?? "yearly" }),
        });
        const data = await res.json();
        if (data?.data?.url) window.location.href = data.data.url;
      } catch {
        // silently fail — user can click manually
      }
    }

    triggerAutoCheckout();
  }, [searchParams]);

  return (
    <section id="pricing" className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {showHeader && (
          <Reveal className="mb-10 text-center">
            <p className="section-label mx-auto mb-6">Pricing</p>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Plans that <span className="text-aurora">scale with you</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">
              Start free. Upgrade when you&apos;re ready. No contracts, no surprises.
            </p>
          </Reveal>
        )}

        {/* Billing toggle */}
        <Reveal className="mb-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              onClick={() => setYearly(false)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                !yearly ? "bg-white text-black shadow" : "text-muted-foreground hover:text-white"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                yearly ? "bg-[#5B6CF6] text-white shadow" : "text-muted-foreground hover:text-white"
              )}
            >
              Yearly
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {yearly ? (
              <span className="flex items-center gap-2">
                <span className="text-emerald-400">Billed yearly. Cancel anytime.</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  Save up to 13%
                </span>
              </span>
            ) : (
              "Billed monthly. Cancel anytime."
            )}
          </p>
        </Reveal>

        {country && (
          <p className="mb-4 text-center text-xs text-white/30">
            Showing prices for {country} · {currency}
          </p>
        )}

        <Stagger className="grid items-start gap-5 lg:grid-cols-3" amount={0.15}>
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} yearly={yearly} currency={currency} />
          ))}
        </Stagger>

        {/* Footer */}
        <Reveal className="mt-12 text-center" delay={0.2}>
          <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> 7-day free trial</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> No credit card required</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Cancel anytime</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
            <Link href="/register" className="font-medium text-aurora hover:underline">
              Try AutoClipr free →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

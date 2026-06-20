"use client";

import { useState } from "react";
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
    price: 25,
    priceYearly: 20,
    tagline: "Perfect for solo creators getting started.",
    icon: Rocket,
    iconClass: "from-violet-500 to-pink-500",
    accentColor: "violet",
    cta: "Start free trial",
    features: [
      { label: "30 short clips / month", icon: PlaySquare },
      { label: "200 credits included", icon: Coins },
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
    price: 49,
    priceYearly: 39,
    tagline: "For creators who publish daily and grow fast.",
    icon: Aperture,
    iconClass: "from-emerald-500 to-cyan-400",
    accentColor: "emerald",
    cta: "Start free trial",
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
    price: 99,
    priceYearly: 79,
    tagline: "For agencies, teams, and serious power users.",
    icon: Briefcase,
    iconClass: "from-orange-500 to-amber-400",
    accentColor: "orange",
    cta: "Start free trial",
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

function PricingCard({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  const Icon = plan.icon;
  const ac = accentMap[plan.accentColor];
  const displayPrice = yearly && plan.priceYearly ? plan.priceYearly : plan.price;

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
        <div className="relative mt-5 flex items-end gap-1">
          <span className="text-5xl font-extrabold tracking-tight text-white">${displayPrice}</span>
          <span className="mb-2 text-sm text-muted-foreground">/month</span>
        </div>
        <p className="relative mt-1 text-xs text-white/30">
          {yearly ? "Billed yearly · Cancel anytime" : "Billed monthly · Cancel anytime"}
        </p>
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
          <Link
            href={`/register?plan=${plan.id}`}
            className={cn(
              "flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all",
              ac.btn
            )}
          >
            {plan.cta}
          </Link>
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

  return (
    <section id="pricing" className="border-t border-white/5 px-4 py-28 sm:px-6">
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
          <p className={cn("text-sm transition-opacity", yearly ? "text-emerald-400 opacity-100" : "opacity-0")}>
            Billed yearly. Cancel anytime.
          </p>
        </Reveal>

        <Stagger className="grid items-start gap-5 lg:grid-cols-3" amount={0.15}>
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} yearly={yearly} />
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

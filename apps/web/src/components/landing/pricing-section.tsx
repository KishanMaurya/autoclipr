"use client";

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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, MotionCard } from "@/components/ui/motion";

type PlanFeature = {
  label: string;
  icon: LucideIcon;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  icon: LucideIcon;
  iconClass: string;
  glowColor: string;
  features: PlanFeature[];
  cta: string;
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 25,
    icon: Rocket,
    iconClass: "bg-gradient-to-br from-violet-500 to-pink-500",
    glowColor: "bg-violet-400",
    cta: "Go Starter",
    features: [
      { label: "30 short clips / month", icon: PlaySquare },
      { label: "200 credits", icon: Coins },
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
    icon: Aperture,
    iconClass: "bg-gradient-to-br from-blue-500 to-cyan-400",
    glowColor: "bg-blue-400",
    cta: "Go Creator",
    popular: true,
    features: [
      { label: "90 short clips / month", icon: PlaySquare },
      { label: "500 credits", icon: Coins },
      { label: "Fast + Pro rendering modes", icon: Zap },
      { label: "AI clip scoring & highlights", icon: Sparkles },
      { label: "Short-form video templates", icon: Flame },
      { label: "Auto captions & subtitles", icon: Subtitles },
      { label: "Brand kits", icon: Award },
      { label: "Priority exports + faster queue", icon: Upload },
      { label: "Multi-platform publishing", icon: PlaySquare },
      { label: "Unlimited exports", icon: Upload },
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    icon: Briefcase,
    iconClass: "bg-gradient-to-br from-zinc-600 to-zinc-900 border border-white/10",
    glowColor: "bg-indigo-400",
    cta: "Go Business",
    features: [
      { label: "200 short clips / month", icon: PlaySquare },
      { label: "1,200 credits", icon: Coins },
      { label: "All rendering modes unlocked", icon: Zap },
      { label: "AI Shorts creator", icon: Sparkles },
      { label: "Auto captions & subtitles", icon: Subtitles },
      { label: "Team access + commercial rights", icon: Users },
      { label: "Priority rendering queue", icon: Upload },
      { label: "Advanced brand kits", icon: Award },
      { label: "Bulk video creation", icon: Layers },
      { label: "Analytics & performance tracking", icon: LineChart },
      { label: "Unlimited exports", icon: Upload },
    ],
  },
];

function GridPattern() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "28px 28px",
      }}
    />
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  const Icon = plan.icon;

  return (
    <MotionCard
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-white/[0.03] backdrop-blur-2xl transition-shadow duration-300",
        plan.popular
          ? "border-blue-500/60 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/30"
          : "border-white/[0.08] hover:border-white/20 hover:shadow-lg hover:shadow-black/40"
      )}
    >
      {plan.popular && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 py-2 text-center text-xs font-bold uppercase tracking-widest text-white">
          Most Popular
        </div>
      )}

      {/* Header */}
      <div className="relative border-b border-white/5 px-6 pb-6 pt-8">
        <GridPattern />
        <span
          className={cn(
            "absolute right-5 top-5 h-2 w-2 rounded-full blur-[1px]",
            plan.glowColor,
            "opacity-80"
          )}
        />

        <div
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-xl shadow-lg",
            plan.iconClass
          )}
        >
          <Icon className="h-7 w-7 text-white" strokeWidth={1.75} />
        </div>

        <h3 className="relative mt-5 text-xl font-bold text-white">{plan.name}</h3>
        <div className="relative mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-white">${plan.price}</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-1 flex-col px-6 py-6">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          What&apos;s included
        </p>
        <ul className="space-y-3.5">
          {plan.features.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <li key={feature.label} className="flex items-start gap-3 text-sm">
                <FeatureIcon
                  className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
                  strokeWidth={1.75}
                />
                <span className="leading-snug text-zinc-300">{feature.label}</span>
              </li>
            );
          })}
        </ul>

        <Button
          className={cn(
            "mt-8 w-full rounded-full font-semibold",
            plan.popular ? "h-12" : "h-11"
          )}
          variant={plan.popular ? "default" : "outline"}
          asChild
        >
          <Link
            href={`/register?plan=${plan.id}`}
            className={cn(
              plan.popular &&
                "bg-blue-600 text-white hover:bg-blue-500 hover:opacity-100"
            )}
          >
            {plan.cta}
          </Link>
        </Button>
      </div>
    </MotionCard>
  );
}

type PricingSectionProps = {
  showHeader?: boolean;
};

export function PricingSection({ showHeader = true }: PricingSectionProps) {
  return (
    <section id="pricing" className="border-t border-white/5 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {showHeader && (
          <Reveal className="mb-14 text-center">
            <p className="section-label mx-auto mb-6">Pricing</p>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Plans that <span className="text-aurora">scale with you</span>
            </h2>
          </Reveal>
        )}

        <Stagger className="grid gap-6 lg:grid-cols-3 lg:gap-5" amount={0.15}>
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </Stagger>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          All plans include a 7-day free trial. No credit card required to start.{" "}
          <Link href="/register" className="text-violet-400 hover:underline">
            Try AutoClipr free →
          </Link>
        </p>
      </div>
    </section>
  );
}

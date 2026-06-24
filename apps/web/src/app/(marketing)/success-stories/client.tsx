"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useMotionValue, useSpring } from "framer-motion";
import { ChevronDown, TrendingUp, Star, Zap, Play, Scissors, Users, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

/* ─── data ─────────────────────────────────────────────────────────────── */

export const STORIES = [
  {
    name: "Alex Rivera",
    channel: "TechBreakdowns",
    avatar: "AR",
    photo: "https://i.pravatar.cc/150?img=11",
    gradient: "from-blue-600 via-blue-500 to-cyan-400",
    glow: "rgba(59,130,246,0.25)",
    title: "From 800 to 120K subscribers in 9 months",
    result: "800 → 120K subs",
    niche: "Tech Reviews",
    quote:
      "AutoClipr automatically cut my 40-minute deep-dives into Shorts that hit 2M+ views. I went from 800 to 120K subscribers without changing my filming schedule at all.",
    metric: "150x",
    metricLabel: "growth",
    tags: ["Shorts", "Tech", "Automation"],
  },
  {
    name: "Priya Sharma",
    channel: "CookingWithPriya",
    avatar: "PS",
    photo: "https://i.pravatar.cc/150?img=47",
    gradient: "from-orange-500 via-rose-500 to-pink-500",
    glow: "rgba(249,115,22,0.25)",
    title: "2.1M views added in 4 months using only Reels",
    result: "12K → 89K subs",
    niche: "Food & Cooking",
    quote:
      "I had no idea which parts of my cooking videos were viral-worthy. AutoClipr’s AI found them for me. My Reels now drive more subscribers than my main channel ever did.",
    metric: "2.1M",
    metricLabel: "new views",
    tags: ["Reels", "Food", "Viral Moments"],
  },
  {
    name: "Marcus Webb",
    channel: "FitnessWithMarcus",
    avatar: "MW",
    photo: "https://i.pravatar.cc/150?img=52",
    gradient: "from-emerald-500 via-green-500 to-teal-400",
    glow: "rgba(16,185,129,0.25)",
    title: "Side hustle channel went full-time in 6 months",
    result: "3K → 55K subs",
    niche: "Fitness",
    quote:
      "I was posting once a week manually clipping highlights. AutoClipr turned every workout video into 6–8 clips automatically. My posting frequency 10x’d overnight.",
    metric: "10x",
    metricLabel: "posting freq",
    tags: ["TikTok", "Fitness", "Consistency"],
  },
  {
    name: "Sarah Chen",
    channel: "TravelWithSarah",
    avatar: "SC",
    photo: "https://i.pravatar.cc/150?img=44",
    gradient: "from-violet-600 via-purple-500 to-pink-400",
    glow: "rgba(139,92,246,0.25)",
    title: "Travel vlogs going viral on TikTok — finally",
    result: "5K → 43K subs",
    niche: "Travel",
    quote:
      "My long-form travel vlogs never performed on short-form. AutoClipr found the cinematic money shots and emotional moments I didn’t even notice while editing. Game changer.",
    metric: "8.6x",
    metricLabel: "growth",
    tags: ["TikTok", "Travel", "Cinematic"],
  },
  {
    name: "Daniel Okafor",
    channel: "FinanceForAll",
    avatar: "DO",
    photo: "https://i.pravatar.cc/150?img=68",
    gradient: "from-yellow-500 via-amber-500 to-orange-500",
    glow: "rgba(234,179,8,0.25)",
    title: "Finance channel cracked the algorithm with Shorts",
    result: "7K → 62K subs",
    niche: "Finance",
    quote:
      "Finance content doesn’t naturally go viral — but AutoClipr found the 60-second hooks in my hour-long breakdowns. Those Shorts now bring in 80% of my new subscribers.",
    metric: "80%",
    metricLabel: "subs from Shorts",
    tags: ["Shorts", "Finance", "Education"],
  },
  {
    name: "Emma Larsson",
    channel: "SketchWithEmma",
    avatar: "EL",
    photo: "https://i.pravatar.cc/150?img=56",
    gradient: "from-teal-500 via-cyan-500 to-sky-400",
    glow: "rgba(20,184,166,0.25)",
    title: "Art channel from obscurity to 1M+ views",
    result: "900 → 28K subs",
    niche: "Art & Creativity",
    quote:
      "Time-lapse art videos are perfect for Shorts but clipping them manually was exhausting. AutoClipr handles it automatically and even adds captions. My art finally found its audience.",
    metric: "1M+",
    metricLabel: "new views",
    tags: ["Shorts", "Art", "Time-lapse"],
  },
  {
    name: "Ryan Patel",
    channel: "GamingWithRyan",
    avatar: "RP",
    photo: "https://i.pravatar.cc/150?img=33",
    gradient: "from-red-500 via-rose-500 to-pink-500",
    glow: "rgba(239,68,68,0.25)",
    title: "Gaming highlights turned into 3M+ total clip views",
    result: "4K → 78K subs",
    niche: "Gaming",
    quote:
      "I was spending 3 hours per stream just cutting highlights. AutoClipr does it in minutes and the clips actually perform better than the ones I manually edited. Insane ROI.",
    metric: "3M+",
    metricLabel: "clip views",
    tags: ["TikTok", "Gaming", "Highlights"],
  },
  {
    name: "Sofia Mendez",
    channel: "MindfulWithSofia",
    avatar: "SM",
    photo: "https://i.pravatar.cc/150?img=25",
    gradient: "from-fuchsia-500 via-violet-500 to-purple-600",
    glow: "rgba(168,85,247,0.25)",
    title: "Mindfulness channel hit 500K monthly impressions",
    result: "1.2K → 31K subs",
    niche: "Wellness",
    quote:
      "My 20-minute meditation sessions felt too long for short-form. AutoClipr extracted the powerful opening hooks and calming moments that now stop people mid-scroll. Pure magic.",
    metric: "26x",
    metricLabel: "growth",
    tags: ["Reels", "Wellness", "Mindfulness"],
  },
  {
    name: "Tom Nakamura",
    channel: "BuildWithTom",
    avatar: "TN",
    photo: "https://i.pravatar.cc/150?img=60",
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    glow: "rgba(14,165,233,0.25)",
    title: "DIY channel scaled to 200K subs with zero extra filming",
    result: "8K → 200K subs",
    niche: "DIY & Build",
    quote:
      "Every build video I post becomes 10 clips automatically. The before/after moments AutoClipr picks are always the ones that go viral. My subscriber count doubled in 4 months.",
    metric: "25x",
    metricLabel: "growth",
    tags: ["Shorts", "DIY", "Before/After"],
  },
];

const TESTIMONIALS = [
  { quote: "AutoClipr saved me 10+ hours a week. I just upload and it handles everything.", name: "Jake T.", handle: "Gaming • 180K subs", stars: 5 },
  { quote: "The AI found a moment I nearly cut. That clip hit 4M views on TikTok.", name: "Lena M.", handle: "Lifestyle • 95K subs", stars: 5 },
  { quote: "From 2K to 40K in 5 months. All from AutoClipr clips driving traffic.", name: "Raj K.", handle: "Education • 40K subs", stars: 5 },
  { quote: "Finally a tool that understands what makes a clip go viral, not random cuts.", name: "Monica B.", handle: "Beauty • 210K subs", stars: 5 },
];

const FAQS = [
  { question: "Does AutoClipr work for any YouTube niche?", answer: "Yes. AutoClipr’s AI is trained on viral moments across all niches — tech, fitness, finance, cooking, travel, gaming, education, and more. The viral detection adapts to your content type automatically." },
  { question: "How long does it take to see results?", answer: "Most creators see their first viral short within 2–4 weeks. Subscriber growth typically accelerates after 60–90 days of consistent short-form posting driven by AutoClipr clips." },
  { question: "Do I need to edit the clips AutoClipr generates?", answer: "No editing required. AutoClipr auto-detects viral moments, trims them precisely, adds captions, and formats for TikTok, Reels, and Shorts — all ready to post in under 2 minutes." },
  { question: "Will short-form clips hurt my long-form channel?", answer: "The opposite. Shorts and Reels consistently drive viewers back to full-length videos. Creators using AutoClipr report 30–50% of their new long-form subscribers discovering them through clips." },
  { question: "How many clips can I generate per month?", answer: "The Starter plan (free) includes 20 clips/month with 100 credits. Pro and Agency plans offer unlimited clips. Every new signup starts on the free Starter plan — no credit card required." },
];

const HOW_IT_WORKS = [
  { step: "01", icon: Play, title: "Upload your video", desc: "Paste a YouTube URL or upload any long-form video — AutoClipr accepts any format.", color: "from-violet-500 to-blue-500" },
  { step: "02", icon: Scissors, title: "AI detects viral moments", desc: "Our model scans for hooks, emotional peaks, and high-engagement segments automatically.", color: "from-emerald-500 to-teal-400" },
  { step: "03", icon: TrendingUp, title: "Post & grow", desc: "Download ready-to-post clips with captions for TikTok, Reels & Shorts in under 2 minutes.", color: "from-orange-500 to-rose-500" },
];

/* ─── animated counter ──────────────────────────────────────────────────── */

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 1800, bounce: 0 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, motionVal, value]);

  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

/* ─── story card ────────────────────────────────────────────────────────── */

function StoryCard({ story, index }: { story: typeof STORIES[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a16] p-6 transition-colors duration-300 hover:border-white/[0.16]"
      style={{ boxShadow: hovered ? `0 0 40px 0 ${story.glow}` : "none" }}
    >
      {/* Gradient top accent */}
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${story.gradient} opacity-60`} />

      {/* Subtle bg glow */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gradient-to-br ${story.gradient} blur-3xl transition-opacity duration-500`}
        style={{ opacity: hovered ? 0.08 : 0 }}
      />

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`relative h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${story.gradient} p-[2px] shadow-lg`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={story.photo}
            alt={story.name}
            className="h-full w-full rounded-[14px] object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {story.niche}
          </span>
          <p className="mt-1 font-semibold text-white">{story.name}</p>
          <p className="text-xs text-white/40">@{story.channel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`bg-gradient-to-br ${story.gradient} bg-clip-text text-2xl font-black text-transparent`}>
            {story.metric}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/30">{story.metricLabel}</p>
        </div>
      </div>

      <h3 className="text-sm font-semibold leading-snug text-white/90">{story.title}</h3>

      <blockquote className="relative pl-4 text-sm italic leading-relaxed text-white/50">
        <div className={`absolute left-0 top-0 h-full w-0.5 rounded-full bg-gradient-to-b ${story.gradient}`} />
        &ldquo;{story.quote}&rdquo;
      </blockquote>

      <div className="mt-auto flex items-center justify-between pt-1">
        <div className="flex flex-wrap gap-1.5">
          {story.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/40">
              {tag}
            </span>
          ))}
        </div>
        <span className={`ml-2 whitespace-nowrap bg-gradient-to-r ${story.gradient} bg-clip-text text-xs font-semibold text-transparent`}>
          {story.result}
        </span>
      </div>
    </motion.div>
  );
}

/* ─── FAQ item ──────────────────────────────────────────────────────────── */

function FaqItem({ faq, index }: { faq: (typeof FAQS)[0]; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className="group border-b border-white/[0.06]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-medium text-white/70 transition-colors group-hover:text-white">{faq.question}</span>
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] transition-all duration-200 ${open ? "rotate-180 border-emerald-500/30 bg-emerald-500/10" : ""}`}>
          <ChevronDown className={`h-3.5 w-3.5 ${open ? "text-emerald-400" : "text-white/40"}`} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/45">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── exported sections ─────────────────────────────────────────────────── */

export function StoriesGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {STORIES.map((story, i) => (
        <StoryCard key={story.name} story={story} index={i} />
      ))}
    </div>
  );
}

export function StatsRow() {
  return (
    <div className="mt-12 flex flex-wrap justify-center gap-10 sm:gap-16">
      {[
        { value: 10, suffix: "K+", label: "Clips generated" },
        { value: 2, suffix: " min", label: "Avg. processing" },
        { value: 99, suffix: "%", label: "Satisfaction rate" },
      ].map((s) => (
        <div key={s.label} className="text-center">
          <p className="text-4xl font-black text-white">
            <AnimatedNumber value={s.value} suffix={s.suffix} />
          </p>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-white/30">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TESTIMONIALS.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a16] p-5 transition-all hover:border-white/[0.14] hover:shadow-[0_0_24px_0_rgba(16,185,129,0.08)]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex gap-0.5">
            {Array.from({ length: t.stars }).map((_, j) => (
              <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="flex-1 text-sm leading-relaxed text-white/60">&ldquo;{t.quote}&rdquo;</p>
          <div className="border-t border-white/[0.05] pt-3">
            <p className="text-sm font-semibold text-white">{t.name}</p>
            <p className="text-xs text-white/35">{t.handle}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {HOW_IT_WORKS.map((item, i) => (
        <motion.div
          key={item.step}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a16] p-7 transition-all hover:border-white/[0.16]"
        >
          {/* Ghost step number */}
          <span className="absolute right-4 top-2 text-7xl font-black text-white/[0.03] select-none">{item.step}</span>

          {/* Connector line between cards */}
          {i < HOW_IT_WORKS.length - 1 && (
            <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
              <div className="h-px w-6 bg-gradient-to-r from-white/20 to-transparent" />
            </div>
          )}

          <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} shadow-lg`}>
            <item.icon className="h-5 w-5 text-white" />
          </div>

          <div className={`mb-1 bg-gradient-to-r ${item.color} bg-clip-text text-xs font-bold uppercase tracking-widest text-transparent`}>
            Step {item.step}
          </div>
          <h3 className="mb-2 font-bold text-white">{item.title}</h3>
          <p className="text-sm leading-relaxed text-white/45">{item.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function FaqSection() {
  return (
    <div>
      {FAQS.map((faq, i) => (
        <FaqItem key={faq.question} faq={faq} index={i} />
      ))}
    </div>
  );
}

export function CtaSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a16] p-10 text-center sm:p-16"
    >
      {/* Multi-layer background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-1/4 bottom-0 h-48 w-64 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-48 w-64 rounded-full bg-blue-500/8 blur-3xl" />
      </div>
      {/* Top rainbow border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

      <div className="relative">
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-[0_0_32px_rgba(16,185,129,0.4)]">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Start for free</p>
        <h2 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
          Ready to write your<br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            success story?
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-white/50">
          Join thousands of creators turning long videos into viral clips — automatically. 100 credits free, no credit card required.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:shadow-[0_0_32px_rgba(16,185,129,0.5)] hover:scale-[1.02]"
          >
            Start free — 100 credits included
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/top-creators"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-sm font-semibold text-white/70 transition-all hover:bg-white/[0.08] hover:text-white hover:border-white/20"
          >
            <Users className="h-4 w-4" />
            Top Creators
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

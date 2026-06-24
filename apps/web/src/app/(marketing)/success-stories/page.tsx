"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Scissors, TrendingUp, Users, Play, Star, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export const metadata = undefined; // Client component — set in layout or use generateMetadata in a server wrapper

const STORIES = [
  {
    name: "Alex Rivera",
    channel: "TechBreakdowns",
    avatar: "AR",
    color: "from-blue-500 to-cyan-400",
    title: "From 800 to 120K subscribers in 9 months",
    result: "800 → 120K subscribers",
    timeframe: "9 months",
    niche: "Tech Reviews",
    quote:
      "AutoClipr automatically cut my 40-minute deep-dives into Shorts that hit 2M+ views. I went from 800 to 120K subscribers without changing my filming schedule at all.",
    metric: "150x",
    metricLabel: "subscriber growth",
    tags: ["Shorts", "Tech", "Automation"],
  },
  {
    name: "Priya Sharma",
    channel: "CookingWithPriya",
    avatar: "PS",
    color: "from-orange-500 to-rose-400",
    title: "2.1M views added in 4 months using only Reels",
    result: "12K → 89K subscribers",
    timeframe: "4 months",
    niche: "Food & Cooking",
    quote:
      "I had no idea which parts of my cooking videos were 'viral-worthy'. AutoClipr's AI found them for me. My Reels now drive more subscribers than my main channel ever did.",
    metric: "2.1M",
    metricLabel: "new views",
    tags: ["Reels", "Food", "Viral Moments"],
  },
  {
    name: "Marcus Webb",
    channel: "FitnessWithMarcus",
    avatar: "MW",
    color: "from-green-500 to-emerald-400",
    title: "Side hustle channel went full-time in 6 months",
    result: "3K → 55K subscribers",
    timeframe: "6 months",
    niche: "Fitness",
    quote:
      "I was posting once a week manually clipping highlights. AutoClipr turned every workout video into 6–8 clips automatically. My posting frequency 10x'd overnight.",
    metric: "10x",
    metricLabel: "posting frequency",
    tags: ["TikTok", "Fitness", "Consistency"],
  },
  {
    name: "Sarah Chen",
    channel: "TravelWithSarah",
    avatar: "SC",
    color: "from-purple-500 to-pink-400",
    title: "Travel vlogs going viral on TikTok — finally",
    result: "5K → 43K subscribers",
    timeframe: "5 months",
    niche: "Travel",
    quote:
      "My long-form travel vlogs never performed on short-form. AutoClipr found the cinematic money shots and emotional moments I didn't even notice while editing. Game changer.",
    metric: "8.6x",
    metricLabel: "subscriber growth",
    tags: ["TikTok", "Travel", "Cinematic"],
  },
  {
    name: "Daniel Okafor",
    channel: "FinanceForAll",
    avatar: "DO",
    color: "from-yellow-500 to-orange-400",
    title: "Finance channel cracked the algorithm with Shorts",
    result: "7K → 62K subscribers",
    timeframe: "7 months",
    niche: "Finance",
    quote:
      "Finance content doesn't naturally go viral — but AutoClipr found the 60-second hooks in my hour-long breakdowns. Those Shorts now bring in 80% of my new subscribers.",
    metric: "80%",
    metricLabel: "subs from Shorts",
    tags: ["Shorts", "Finance", "Education"],
  },
  {
    name: "Emma Larsson",
    channel: "SketchWithEmma",
    avatar: "EL",
    color: "from-teal-500 to-cyan-400",
    title: "Art channel from obscurity to 1M+ views",
    result: "900 → 28K subscribers",
    timeframe: "8 months",
    niche: "Art & Creativity",
    quote:
      "Time-lapse art videos are perfect for Shorts but clipping them manually was exhausting. AutoClipr handles it automatically and even adds captions. My art finally found its audience.",
    metric: "1M+",
    metricLabel: "total new views",
    tags: ["Shorts", "Art", "Time-lapse"],
  },
];

const FAQS = [
  {
    question: "Does AutoClipr work for any YouTube niche?",
    answer:
      "Yes. AutoClipr's AI is trained on viral moments across all niches — tech, fitness, finance, cooking, travel, gaming, education, and more. The viral detection adapts to your content type automatically.",
  },
  {
    question: "How long does it take to see results?",
    answer:
      "Most creators see their first viral short within 2–4 weeks. Subscriber growth typically accelerates after 60–90 days of consistent short-form posting driven by AutoClipr clips.",
  },
  {
    question: "Do I need to edit the clips AutoClipr generates?",
    answer:
      "No editing required. AutoClipr auto-detects viral moments, trims them precisely, adds captions, and formats for TikTok, Reels, and Shorts — all ready to post in under 2 minutes.",
  },
  {
    question: "Will short-form clips hurt my long-form channel?",
    answer:
      "The opposite. Shorts and Reels consistently drive viewers back to full-length videos. Creators using AutoClipr report 30–50% of their new long-form subscribers discovering them through clips.",
  },
  {
    question: "How many clips can I generate per month?",
    answer:
      "The Starter plan (free) includes 20 clips/month with 100 credits. Pro and Agency plans offer unlimited clips. Every new signup starts on the free Starter plan — no credit card required.",
  },
];

const TESTIMONIALS = [
  {
    quote: "AutoClipr saved me 10+ hours a week. I just upload and it handles everything.",
    name: "Jake T.",
    handle: "Gaming channel • 180K subs",
    stars: 5,
  },
  {
    quote: "The AI found a moment in my video I nearly cut. That clip hit 4M views on TikTok.",
    name: "Lena M.",
    handle: "Lifestyle channel • 95K subs",
    stars: 5,
  },
  {
    quote: "From 2K to 40K in 5 months. All from AutoClipr clips driving traffic to my channel.",
    name: "Raj K.",
    handle: "Education channel • 40K subs",
    stars: 5,
  },
  {
    quote: "Finally a tool that actually understands what makes a clip go viral, not just random cuts.",
    name: "Monica B.",
    handle: "Beauty channel • 210K subs",
    stars: 5,
  },
];

function StoryCard({ story, index }: { story: typeof STORIES[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      className="group relative flex flex-col gap-5 rounded-2xl border border-white/[0.08] bg-[#0d0d18]/80 p-6 transition-all hover:border-white/20 hover:bg-white/[0.03]"
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${story.color} text-base font-bold text-white shadow-lg`}>
          {story.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{story.niche}</p>
          <p className="mt-0.5 font-semibold text-white">{story.name}</p>
          <p className="text-sm text-white/50">@{story.channel}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-extrabold text-aurora">{story.metric}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/40">{story.metricLabel}</p>
        </div>
      </div>

      <h3 className="text-base font-semibold leading-snug text-white">{story.title}</h3>

      <blockquote className="relative border-l-2 border-emerald-500/40 pl-4 text-sm leading-relaxed text-white/60 italic">
        "{story.quote}"
      </blockquote>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {story.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/50">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-emerald-400 font-medium whitespace-nowrap ml-2">{story.result}</span>
      </div>
    </motion.div>
  );
}

function FaqItem({ faq, index }: { faq: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className="border-b border-white/[0.06]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-medium text-white/80">{faq.question}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/50">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SuccessStoriesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="section-label mx-auto mb-6 inline-flex items-center gap-2"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Real results from real creators
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl"
          >
            Creator{" "}
            <span className="gradient-text">Success Stories</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-lg text-white/50"
          >
            Creators using AutoClipr to turn long-form videos into viral short-form content — automatically.
          </motion.p>

          {/* Mini stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-wrap justify-center gap-8"
          >
            {[
              { value: "10K+", label: "Clips generated" },
              { value: "2 min", label: "Avg. processing" },
              { value: "99%", label: "Satisfaction rate" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-aurora">{s.value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-white/40">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stories grid */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STORIES.map((story, i) => (
              <StoryCard key={story.name} story={story} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials marquee-style row */}
      <section className="border-y border-white/[0.06] bg-white/[0.01] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-white/30"
          >
            What creators are saying
          </motion.p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl border border-white/[0.08] bg-[#0d0d18]/80 p-5"
              >
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-white/70">"{t.quote}"</p>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/40">{t.handle}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works strip */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <span className="section-label mb-4 inline-flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              How it works
            </span>
            <h2 className="text-3xl font-bold text-white">Go viral in 3 steps</h2>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { step: "01", icon: Play, title: "Upload your video", desc: "Paste a YouTube URL or upload any long-form video — AutoClipr accepts any format." },
              { step: "02", icon: Scissors, title: "AI detects viral moments", desc: "Our model scans for hooks, emotional peaks, and high-engagement segments automatically." },
              { step: "03", icon: TrendingUp, title: "Post & grow", desc: "Download ready-to-post clips with captions for TikTok, Reels & Shorts in under 2 minutes." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0d0d18]/80 p-6"
              >
                <span className="text-5xl font-black text-white/[0.04]">{item.step}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <item.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/[0.06] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <h2 className="text-3xl font-bold text-white">Frequently asked questions</h2>
          </motion.div>
          <div>
            {FAQS.map((faq, i) => (
              <FaqItem key={faq.question} faq={faq} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-12 text-center"
        >
          <div className="mb-4 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
              <Scissors className="h-7 w-7 text-white" />
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to write your success story?
          </h2>
          <p className="mt-4 text-white/50">
            Join thousands of creators turning long videos into viral clips — automatically. Free to start, no credit card required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow transition-opacity hover:opacity-90"
            >
              Start free — 100 credits included
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/top-creators"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <Users className="h-4 w-4" />
              Top Creators
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

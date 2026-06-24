"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

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

function FaqItem({ faq, index }: { faq: (typeof FAQS)[0]; index: number }) {
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
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
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

export function FaqSection() {
  return (
    <div>
      {FAQS.map((faq, i) => (
        <FaqItem key={faq.question} faq={faq} index={i} />
      ))}
    </div>
  );
}

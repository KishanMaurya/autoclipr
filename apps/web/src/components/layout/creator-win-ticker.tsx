"use client";

import { useEffect, useState } from "react";
import { Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";

const WINS = [
  { creator: "TechWithMike", from: "0 clips/week", to: "50K+ views", highlight: "50K+ views" },
  { creator: "FitnessByAna", from: "new channel", to: "100K views in 30 days", highlight: "100K views" },
  { creator: "DailyTravelVlog", from: "2K subs", to: "28K subs with AutoClipr", highlight: "28K subs" },
  { creator: "CodeWithRaj", from: "1 upload/week", to: "viral in 3 days", highlight: "viral" },
  { creator: "ChefMarcos", from: "manual editing", to: "10× faster workflow", highlight: "10× faster" },
  { creator: "GamingWithZara", from: "500 views/video", to: "250K+ reach", highlight: "250K+ reach" },
  { creator: "MindsetWithLeo", from: "0 subscribers", to: "10K subs in 60 days", highlight: "10K subs" },
  { creator: "StyleByNadia", from: "3 min edits", to: "30s clips auto-generated", highlight: "auto-generated" },
  { creator: "CryptoWithJay", from: "low engagement", to: "3× watch time", highlight: "3× watch time" },
  { creator: "PetsByMia", from: "hobby channel", to: "monetized in 45 days", highlight: "monetized" },
];

export function CreatorWinTicker() {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % WINS.length);
        setFading(false);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const win = WINS[index];
  const text = `${win.creator} · ${win.from} → `;

  return (
    <div className="flex justify-center py-3">
      <Link
        href="/register"
        className="group flex items-center gap-0 rounded-full border border-white/[0.08] bg-[#0d0d18]/80 px-1 py-1 pr-3 text-xs backdrop-blur-sm transition hover:border-white/20"
      >
        {/* Trophy badge */}
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
          <Trophy className="h-3 w-3 text-amber-400" />
          Creator Win
        </span>
        <span className="mx-1.5 text-white/30">|</span>

        {/* Rotating text */}
        <span
          className="transition-opacity duration-300"
          style={{ opacity: fading ? 0 : 1 }}
        >
          <span className="text-white/60">{text}</span>
          <span className="font-semibold text-emerald-400">{win.highlight}</span>
          <span className="text-white/40"> with AutoClipr</span>
        </span>

        <ArrowRight className="ml-2 h-3 w-3 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
      </Link>
    </div>
  );
}

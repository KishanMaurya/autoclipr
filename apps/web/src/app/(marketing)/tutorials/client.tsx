"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Clock, ChevronRight, Search, X } from "lucide-react";
import type { Tutorial, Category } from "./data";

export type { Tutorial, Category };

const EASE = [0.22, 1, 0.36, 1] as const;

const CATEGORIES: Category[] = ["All", "Getting Started", "Clips & AI", "Exporting", "Growth Tips", "Advanced"];

const LEVEL_COLOR: Record<Tutorial["level"], string> = {
  Beginner:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Intermediate: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Advanced:     "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

function VideoModal({ tutorial, onClose }: { tutorial: Tutorial; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.3, ease: EASE }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0a0a16] shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/60 transition-colors hover:bg-white/[0.14] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* 16:9 YouTube embed */}
          <div className="aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${tutorial.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              className="h-full w-full"
              style={{ border: "none" }}
            />
          </div>

          <div className="p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${LEVEL_COLOR[tutorial.level]}`}>
                {tutorial.level}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/30">
                <Clock className="h-3 w-3" />{tutorial.duration}
              </span>
              {tutorial.views && <span className="text-xs text-white/30">{tutorial.views} views</span>}
            </div>
            <h3 className="text-lg font-bold text-white">{tutorial.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/50">{tutorial.desc}</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function TutorialCard({ tutorial, index, onClick }: { tutorial: Tutorial; index: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: EASE }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a16] transition-all hover:border-white/[0.16] hover:shadow-[0_0_28px_rgba(0,0,0,0.4)]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${tutorial.youtubeId}/mqdefault.jpg`}
          alt={tutorial.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/20" />

        {/* Play button */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${hovered ? "opacity-100" : "opacity-70"}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-200 group-hover:scale-110">
            <Play className="h-5 w-5 fill-black text-black" />
          </div>
        </div>

        {/* Duration */}
        <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {tutorial.duration}
        </div>

        {/* New badge */}
        {tutorial.new && (
          <div className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-2 py-0.5 text-[10px] font-bold text-white">
            New
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${LEVEL_COLOR[tutorial.level]}`}>
            {tutorial.level}
          </span>
          {tutorial.views && <span className="text-xs text-white/30">{tutorial.views} views</span>}
        </div>
        <h3 className="mb-1.5 text-sm font-semibold leading-snug text-white group-hover:text-emerald-300 transition-colors">{tutorial.title}</h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-white/40">{tutorial.desc}</p>
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
          Watch tutorial <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </motion.div>
  );
}

export function TutorialsGrid({ tutorials }: { tutorials: Tutorial[] }) {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Tutorial | null>(null);

  const filtered = tutorials.filter((t) => {
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div>
      {/* Search + filter */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tutorials…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-emerald-500/40 focus:bg-white/[0.06]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${activeCategory === cat ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/[0.07] bg-white/[0.03] text-white/40 hover:border-white/[0.14] hover:text-white/70"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="mb-6 text-xs text-white/25">
        {filtered.length} tutorial{filtered.length !== 1 ? "s" : ""}
        {activeCategory !== "All" && ` in ${activeCategory}`}
        {search && ` matching "${search}"`}
      </p>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center text-white/30"
          >
            No tutorials found. Try a different search or category.
          </motion.div>
        ) : (
          <motion.div
            key={activeCategory + search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((t, i) => (
              <TutorialCard key={t.id} tutorial={t} index={i} onClick={() => setActive(t)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video modal */}
      {active && <VideoModal tutorial={active} onClose={() => setActive(null)} />}
    </div>
  );
}

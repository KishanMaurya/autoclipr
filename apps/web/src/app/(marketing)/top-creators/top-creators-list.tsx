"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Users, Eye, Video, ArrowRight, ChevronRight } from "lucide-react";
import { ChannelSearchBar } from "@/components/top-creators/channel-search-bar";
import { cn } from "@/lib/utils";

// Static metadata (rank, niche, country flag) — real stats/thumbnails come from YouTube API
const CREATORS_META = [
  { rank: 1, name: "MrBeast",          niche: "Entertainment", country: "🇺🇸", tier: "gold"   },
  { rank: 2, name: "T-Series",          niche: "Music",         country: "🇮🇳", tier: "silver" },
  { rank: 3, name: "Cocomelon",         niche: "Kids",          country: "🇺🇸", tier: "bronze" },
  { rank: 4, name: "SET India",         niche: "Entertainment", country: "🇮🇳" },
  { rank: 5, name: "Vlad and Niki",     niche: "Kids",          country: "🇺🇸" },
  { rank: 6, name: "Stokes Twins",      niche: "Entertainment", country: "🇺🇸" },
  { rank: 7, name: "Kids Diana Show",   niche: "Kids",          country: "🇺🇦" },
  { rank: 8, name: "Like Nastya",       niche: "Kids",          country: "🇷🇺" },
  { rank: 9, name: "Zee Music Company", niche: "Music",         country: "🇮🇳" },
  { rank: 10, name: "5-Minute Crafts",  niche: "Lifestyle",     country: "🇨🇾" },
  { rank: 11, name: "BLACKPINK",        niche: "Music",         country: "🇰🇷" },
  { rank: 12, name: "Justin Bieber",    niche: "Music",         country: "🇨🇦" },
  { rank: 13, name: "Mark Rober",       niche: "Technology",    country: "🇺🇸" },
  { rank: 14, name: "Dude Perfect",     niche: "Sports",        country: "🇺🇸" },
  { rank: 15, name: "Nicki Minaj",      niche: "Music",         country: "🇹🇹" },
  { rank: 16, name: "Shakira",          niche: "Music",         country: "🇨🇴" },
  { rank: 17, name: "ABP NEWS",         niche: "News",          country: "🇮🇳" },
  { rank: 18, name: "BeatboxJCOP",      niche: "Entertainment", country: "🇲🇽" },
  { rank: 19, name: "Toys and Colors",  niche: "Kids",          country: "🇺🇸" },
  { rank: 20, name: "Alan's Universe",  niche: "Entertainment", country: "🇵🇭" },
];

type YTLive = { name: string; thumbnail: string; subs: string; views: string; videos: string; country: string };
type Creator = typeof CREATORS_META[number] & { thumbnail?: string; subs: string; views: string; videos: string };

const COUNTRIES = ["🇺🇸 United States", "🇮🇳 India", "🇬🇧 United Kingdom", "🇨🇦 Canada", "🇧🇷 Brazil", "🇰🇷 South Korea", "🇯🇵 Japan", "🇲🇽 Mexico"];
const CATEGORIES = ["Entertainment", "Music", "Kids", "Gaming", "Education", "Technology", "Sports", "Lifestyle", "News", "Food", "Travel"];
const SORT_OPTIONS = [
  { key: "rank", label: "Rank", icon: TrendingUp },
  { key: "subs", label: "Subscribers", icon: Users },
  { key: "views", label: "Views", icon: Eye },
  { key: "videos", label: "Videos", icon: Video },
];

function RankBadge({ rank, tier }: { rank: number; tier?: string }) {
  if (tier === "gold") return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-sm font-extrabold text-black shadow-lg shadow-yellow-500/30">
      1
    </div>
  );
  if (tier === "silver") return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 text-sm font-extrabold text-black shadow-lg">
      2
    </div>
  );
  if (tier === "bronze") return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-extrabold text-white shadow-lg shadow-orange-500/30">
      3
    </div>
  );
  return (
    <div className="flex h-10 w-10 items-center justify-center text-sm font-semibold text-white/40">
      #{rank}
    </div>
  );
}

const GRAD_COLORS = [
  "from-emerald-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-orange-500 to-red-500",
  "from-blue-500 to-indigo-500",
  "from-pink-500 to-rose-500",
];

function Avatar({ name, thumbnail }: { name: string; thumbnail?: string }) {
  if (thumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbnail} alt={name} className="h-11 w-11 shrink-0 rounded-full object-cover border border-white/10 shadow-lg" />
    );
  }
  const color = GRAD_COLORS[name.charCodeAt(0) % GRAD_COLORS.length];
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${color} text-base font-bold text-white shadow-lg`}>
      {name.charAt(0)}
    </div>
  );
}

// Merge static meta with live YouTube data
function buildCreators(liveMap: Record<string, YTLive>): Creator[] {
  return CREATORS_META.map((m) => {
    const live = liveMap[m.name];
    return {
      ...m,
      thumbnail: live?.thumbnail ?? "",
      subs: live?.subs ?? "—",
      views: live?.views ?? "—",
      videos: live?.videos ?? "—",
    };
  });
}

export function TopCreatorsList() {
  const router = useRouter();
  const [sort, setSort] = useState("rank");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [channelSearch, setChannelSearch] = useState("");
  const [liveMap, setLiveMap] = useState<Record<string, YTLive>>({});

  useEffect(() => {
    fetch("/api/youtube/creators")
      .then((r) => r.json())
      .then((data: YTLive[]) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, YTLive> = {};
        for (const d of data) map[d.name] = d;
        setLiveMap(map);
      })
      .catch(() => {});
  }, []);

  const CREATORS = buildCreators(liveMap);

  const filtered = CREATORS.filter((c) => {
    if (activeCategory && c.niche !== activeCategory) return false;
    if (channelSearch && !c.name.toLowerCase().includes(channelSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen pt-2">
      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">Live Stats · Refreshed daily</span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Top 100 YouTube<br />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Creators by Subscribers
                </span>
              </h1>
              <p className="mt-3 max-w-lg text-white/50">
                Live rankings with view counts, growth trends, and channel stats. Study what the best are doing — then clip it with AutoClipr.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-emerald-400"
            >
              Start clipping — free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Search bar */}
          <div className="mt-6">
            <ChannelSearchBar
              localSearch={channelSearch}
              onLocalSearchChange={setChannelSearch}
            />
            {channelSearch && (
              <p className="mt-2 text-xs text-white/30">
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;{channelSearch}&quot; in list
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden w-52 shrink-0 lg:block">
            {/* Sort */}
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Sort By</p>
              <ul className="space-y-1">
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <li key={opt.key}>
                      <button
                        onClick={() => setSort(opt.key)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                          sort === opt.key
                            ? "bg-emerald-500/15 font-semibold text-emerald-400"
                            : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* By Country */}
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Top 100 by Country</p>
              <ul className="space-y-1">
                {COUNTRIES.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => setActiveCountry(activeCountry === c ? null : c)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors",
                        activeCountry === c
                          ? "bg-emerald-500/15 font-semibold text-emerald-400"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                      )}
                    >
                      <TrendingUp className="h-3 w-3 text-emerald-500/60" />
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* By Category */}
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Top 100 by Category</p>
              <ul className="space-y-1">
                {CATEGORIES.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => setActiveCategory(activeCategory === c ? null : c)}
                      className={cn(
                        "w-full rounded-xl px-3 py-1.5 text-left text-sm transition-colors",
                        activeCategory === c
                          ? "bg-emerald-500/15 font-semibold text-emerald-400"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                      )}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Sort tabs */}
            <div className="mb-4 flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all",
                      sort === opt.key
                        ? "bg-emerald-500 text-white shadow"
                        : "text-white/40 hover:text-white/70"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Table header — hidden on mobile */}
            <div className="mb-2 hidden sm:grid grid-cols-[auto_1fr_100px_100px_80px_36px] items-center gap-3 px-4 text-[10px] font-bold uppercase tracking-widest text-white/25">
              <div className="w-10">Rank</div>
              <div>Channel</div>
              <div className="text-right">Subscribers</div>
              <div className="text-right">Views</div>
              <div className="text-right">Videos</div>
              <div />
            </div>

            {/* Rows */}
            <div className="space-y-1">
              {filtered.map((creator, i) => (
                <div key={creator.rank}>
                  {/* Mid-list CTA */}
                  {i === 10 && (
                    <div className="my-4 flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div>
                        <p className="font-semibold text-white">See a creator you want to beat?</p>
                        <p className="text-sm text-white/40">Clip their best moments — start in 30 seconds.</p>
                      </div>
                      <Link
                        href="/register"
                        className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-400"
                      >
                        Start free
                      </Link>
                    </div>
                  )}
                  {/* Mobile card layout / Desktop grid row */}
                  <div
                    onClick={() => router.push(`/top-creators/${encodeURIComponent(creator.name.toLowerCase().replace(/\s+/g, "-"))}`)}
                    className="group cursor-pointer rounded-2xl border border-transparent px-3 py-3 transition-all hover:border-white/[0.06] hover:bg-white/[0.03] sm:px-4"
                  >
                    {/* Mobile layout */}
                    <div className="flex items-center gap-3 sm:hidden">
                      <RankBadge rank={creator.rank} tier={creator.tier} />
                      <Avatar name={creator.name} thumbnail={creator.thumbnail} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{creator.name}</p>
                        <p className="text-xs text-white/35">{creator.country} · {creator.niche}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white">{creator.subs}</p>
                        <p className="text-[10px] text-white/30">subs</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
                    </div>
                    {/* Desktop grid layout */}
                    <div className="hidden sm:grid grid-cols-[auto_1fr_100px_100px_80px_36px] items-center gap-3">
                      <RankBadge rank={creator.rank} tier={creator.tier} />
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={creator.name} thumbnail={creator.thumbnail} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{creator.name}</p>
                          <p className="text-xs text-white/35">{creator.country} · {creator.niche}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">{creator.subs}</p>
                        <p className="text-[10px] text-white/30">subs</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">{creator.views}</p>
                        <p className="text-[10px] text-white/30">views</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">{creator.videos}</p>
                        <p className="text-[10px] text-white/30">videos</p>
                      </div>
                      <button className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-white/30 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 opacity-0 group-hover:opacity-100">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-8 rounded-3xl bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 text-center sm:p-8">
              <h2 className="text-2xl font-bold text-white">Your turn to climb the rankings</h2>
              <p className="mt-2 text-white/70">
                Auto-clip top creators&apos; best moments, add captions, and publish across platforms — in minutes.
              </p>
              <Link
                href="/register"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-lg transition hover:bg-white/90"
              >
                Start clipping free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

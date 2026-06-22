"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users, Loader2 } from "lucide-react";

type Result = {
  channelId: string;
  name: string;
  thumbnail: string;
  subscribers: string;
};

function fmt(n: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num) || num === 0) return "";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M subscribers`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}K subscribers`;
  return `${num} subscribers`;
}

type Props = {
  localSearch?: string;
  onLocalSearchChange?: (v: string) => void;
};

export function ChannelSearchBar({ localSearch, onLocalSearchChange }: Props = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) { setResults([]); return; }
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Channel search error:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    onLocalSearchChange?.(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (val.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true); // show spinner immediately
    timerRef.current = setTimeout(() => doSearch(val.trim()), 400);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setLoading(false);
    onLocalSearchChange?.("");
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const go = (name: string) => {
    setFocused(false);
    setQuery("");
    setResults([]);
    onLocalSearchChange?.("");
    router.push(`/top-creators/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}`);
  };

  const showDropdown = focused && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Find a YouTube channel..."
          className="w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] py-3.5 pl-11 pr-10 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-500/20"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/30 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0d0d1f] shadow-2xl shadow-black/70">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-white/40">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              Searching YouTube...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-white/30">
              <Users className="h-4 w-4" />
              No channels found for &quot;{query}&quot;
            </div>
          )}

          {!loading && results.map((r) => (
            <button
              key={r.channelId}
              onClick={() => go(r.name)}
              className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
            >
              {r.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.thumbnail}
                  alt={r.name}
                  className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-bold text-white">
                  {r.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-emerald-400">
                  {r.name}
                </p>
                {r.subscribers && (
                  <p className="text-xs text-white/35">{fmt(r.subscribers)}</p>
                )}
              </div>
              <span className="shrink-0 text-white/20 transition-colors group-hover:text-white/50">↗</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

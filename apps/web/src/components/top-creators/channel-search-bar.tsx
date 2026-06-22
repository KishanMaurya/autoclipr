"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users } from "lucide-react";

type Result = {
  channelId: string;
  name: string;
  thumbnail: string;
  subscribers: string;
  description: string;
};

function formatSubs(n: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num)) return "";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M subscribers`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K subscribers`;
  return `${num} subscribers`;
}

type BarProps = {
  localSearch?: string;
  onLocalSearchChange?: (v: string) => void;
};

export function ChannelSearchBar({ localSearch, onLocalSearchChange }: BarProps = {}) {
  const router = useRouter();
  const [query, setQuery] = useState(localSearch ?? "");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => search(query.trim()), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate = (name: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/top-creators/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          type="text"
          placeholder="Find a channel..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); onLocalSearchChange?.(e.target.value); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          className="w-full rounded-2xl border border-white/[0.10] bg-white/[0.04] py-3.5 pl-11 pr-10 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-500/20"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); onLocalSearchChange?.(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/30 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0d0d1f] shadow-2xl shadow-black/60">
          {loading && (
            <div className="flex items-center gap-3 px-4 py-3 text-sm text-white/40">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              Searching...
            </div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-white/30">
              <Users className="h-4 w-4" /> No channels found for &quot;{query}&quot;
            </div>
          )}
          {!loading && results.map((r) => (
            <button
              key={r.channelId}
              onClick={() => navigate(r.name)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.06] group"
            >
              {r.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnail} alt={r.name} className="h-9 w-9 shrink-0 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-sm font-bold text-white">
                  {r.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">{r.name}</p>
                {r.subscribers && (
                  <p className="text-xs text-white/35">{formatSubs(r.subscribers)}</p>
                )}
              </div>
              <span className="shrink-0 text-white/20 group-hover:text-white/50 transition-colors">↗</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

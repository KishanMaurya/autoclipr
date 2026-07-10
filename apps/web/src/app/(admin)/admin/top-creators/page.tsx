import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Trophy, Video, Scissors, Flame, Link2 } from "lucide-react";

export const metadata: Metadata = { title: "Top Creators" };

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

type Creator = {
  id: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl: string | null;
  isTrial: boolean;
  connectedAt: string;
  userEmail: string | null;
  tier: string;
  credits: number;
  videoCount: number;
  clipCount: number;
};

async function fetchTopCreators(): Promise<Creator[]> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const res = await fetch(`${API}/admin/top-creators`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

const TIER_COLORS: Record<string, string> = {
  free:     "bg-white/10 text-white/50",
  starter:  "bg-blue-500/15 text-blue-400",
  creator:  "bg-violet-500/15 text-violet-400",
  business: "bg-emerald-500/15 text-emerald-400",
  pro:      "bg-amber-500/15 text-amber-400",
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "from-emerald-500 to-cyan-500", "from-violet-500 to-purple-500",
    "from-orange-500 to-red-500",   "from-blue-500 to-indigo-500",
    "from-pink-500 to-rose-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-10 w-10 rounded-xl object-cover" />;
  }
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-xs font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 text-xs font-extrabold text-black">1</div>;
  if (rank === 2) return <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 text-xs font-extrabold text-black">2</div>;
  if (rank === 3) return <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-extrabold text-white">3</div>;
  return <div className="flex h-8 w-8 items-center justify-center text-xs font-semibold text-white/30">#{rank}</div>;
}

export default async function TopCreatorsPage() {
  const creators = await fetchTopCreators();

  const totalVideos    = creators.reduce((s, c) => s + c.videoCount, 0);
  const totalClips     = creators.reduce((s, c) => s + c.clipCount, 0);
  const activeChannels = creators.filter((c) => c.clipCount > 0).length;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Top Creators</h1>
        <p className="mt-1 text-sm text-white/35">
          User-connected YouTube channels · ranked by clips generated
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Link2,    label: "Total Channels",  value: creators.length, color: "text-blue-400",    bg: "bg-blue-500/10" },
          { icon: Flame,    label: "Active Channels", value: activeChannels,  color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { icon: Video,    label: "Total Videos",    value: totalVideos,     color: "text-violet-400",  bg: "bg-violet-500/10" },
          { icon: Scissors, label: "Total Clips",     value: totalClips,      color: "text-orange-400",  bg: "bg-orange-500/10" },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-5">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-white/35">{label}</p>
          </div>
        ))}
      </div>

      {creators.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Trophy className="h-10 w-10 text-white/20" />
          <p className="text-lg font-semibold text-white">No channels connected yet</p>
          <p className="text-sm text-white/40">Users haven&apos;t connected any YouTube channels.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/30">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/30">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/30 hidden sm:table-cell">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/30 hidden md:table-cell">Plan</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/30">Videos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/30">Clips</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/30 hidden lg:table-cell">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {creators.map((c, i) => (
                <tr key={c.id} className="transition hover:bg-white/[0.025]">
                  <td className="px-4 py-3">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.channelName} url={c.thumbnailUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{c.channelName}</p>
                        <a
                          href={c.channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-[11px] text-white/30 hover:text-white/60"
                        >
                          {c.channelUrl.replace(/^https?:\/\/(www\.)?/, "")}
                        </a>
                      </div>
                      {c.isTrial && (
                        <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                          trial
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="max-w-[160px] truncate text-xs text-white/50">
                      {c.userEmail ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${TIER_COLORS[c.tier] ?? TIER_COLORS.free}`}>
                      {c.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/70">
                    {c.videoCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={c.clipCount > 0 ? "font-semibold text-emerald-400" : "text-white/30"}>
                      {c.clipCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/50 hidden lg:table-cell">
                    {c.credits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Video, Calendar, Globe, BadgeCheck, TrendingUp, Eye, Users, DollarSign } from "lucide-react";
import { searchChannel, getTopVideos, formatCount, estimateMonthlyEarnings } from "@/lib/youtube-api";
import { ChannelCharts } from "./channel-charts";

// Rank lookup — ordered list matches CREATORS_META
const CREATOR_RANKS: Record<string, number> = {
  "mrbeast": 1, "t-series": 2, "cocomelon": 3, "set india": 4,
  "vlad and niki": 5, "stokes twins": 6, "kids diana show": 7, "like nastya": 8,
  "zee music company": 9, "5-minute crafts": 10, "blackpink": 11, "justin bieber": 12,
  "mark rober": 13, "dude perfect": 14, "nicki minaj": 15, "shakira": 16,
  "abp news": 17, "beatboxjcop": 18, "toys and colors": 19, "alan's universe": 20,
};

type Props = { params: Promise<{ channel: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { channel } = await params;
  const name = decodeURIComponent(channel).replace(/-/g, " ");
  return { title: `${name} — YouTube Stats · AutoClipr` };
}

export default async function ChannelPage({ params }: Props) {
  const { channel } = await params;
  const name = decodeURIComponent(channel).replace(/-/g, " ");

  const [channelData, topVideos] = await Promise.all([
    searchChannel(name),
    searchChannel(name).then((ch) => ch ? getTopVideos(ch.id) : []),
  ]);

  const hasKey = !!process.env.YOUTUBE_API_KEY;

  if (!channelData) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
          <Users className="h-8 w-8 text-white/30" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          {hasKey ? "Channel not found" : "API key not configured"}
        </h1>
        <p className="text-white/40 max-w-sm">
          {hasKey
            ? `We couldn't find YouTube data for "${name}". Try checking the spelling.`
            : "YOUTUBE_API_KEY is missing from environment variables."}
        </p>
        <Link href="/top-creators" className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Top Creators
        </Link>
      </div>
    );
  }

  const subs = formatCount(channelData.subscribers);
  const views = formatCount(channelData.views);
  const videos = formatCount(channelData.videoCount);
  const earnings = estimateMonthlyEarnings(channelData.views);
  const yearsOld = Math.floor((Date.now() - new Date(channelData.publishedAt).getTime()) / (365.25 * 24 * 3600 * 1000));

  const countryFlag = channelData.country
    ? [...channelData.country.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("")
    : "";

  const globalRank = CREATOR_RANKS[name.toLowerCase()];
  const rankDisplay = globalRank ? `#${globalRank}` : "—";
  const rankSub = globalRank ? `Top ${globalRank <= 10 ? 10 : 20} Worldwide` : "Not in top 20";

  const STATS = [
    { icon: Users, label: "Subscribers", value: subs, color: "text-emerald-400" },
    { icon: Eye, label: "Total Video Views", value: views, color: "text-cyan-400" },
    { icon: DollarSign, label: "Est. Monthly Earnings", value: earnings, color: "text-yellow-400" },
    { icon: TrendingUp, label: "Ranking (Global)", value: rankDisplay, sub: rankSub, color: "text-violet-400" },
  ];

  return (
    <div className="min-h-screen">
      {/* Back */}
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/top-creators" className="inline-flex items-center gap-1.5 text-sm text-white/40 transition hover:text-white/80">
            <ArrowLeft className="h-3.5 w-3.5" /> Top Creators
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {channelData.thumbnail ? (
                <Image
                  src={channelData.thumbnail}
                  alt={channelData.title}
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-white/10"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-2xl font-bold text-white">
                  {channelData.title.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{channelData.title}</h1>
                <BadgeCheck className="h-6 w-6 shrink-0 text-emerald-400" />
              </div>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-white/30">
                YouTube Subscribers, Views & Earnings
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/40">
                <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> {videos} Videos</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {yearsOld} years</span>
                {channelData.country && (
                  <span className="flex items-center gap-1">{countryFlag} {channelData.country}</span>
                )}
                <span className="text-white/20">Updated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              <Link
                href="/register"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-emerald-400"
              >
                Clip this channel — free
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                  <div className="flex items-center gap-1.5 text-xs text-white/35">
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                  </div>
                  <p className={`mt-3 text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                  {s.sub && <p className="mt-0.5 text-xs text-white/30">{s.sub}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts + Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ChannelCharts
          channelName={channelData.title}
          subscribers={channelData.subscribers}
          totalViews={channelData.views}
          topVideos={topVideos}
        />

        {/* CTA banner */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-5 sm:flex-row">
          <div>
            <p className="font-semibold text-white">Want to clip {channelData.title}&apos;s best moments?</p>
            <p className="text-sm text-white/40">AutoClipr finds viral clips, adds captions and publishes everywhere — free.</p>
          </div>
          <Link
            href="/register"
            className="shrink-0 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Start free
          </Link>
        </div>
      </div>
    </div>
  );
}

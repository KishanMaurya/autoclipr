import { NextResponse } from "next/server";

// Verified YouTube channel IDs for the top 20 creators
const CHANNEL_IDS: Record<string, string> = {
  MrBeast:             "UCX6OQ3DkcsbYNE6H8uQQuVA",
  "T-Series":          "UCq-Fj5jknLsUf-MWSy4_brA",
  Cocomelon:           "UCbCmjCuTUZos6Inko4u57UQ",
  "SET India":         "UCpEhnqL0y41EpW2TvWAHD7Q",
  "Vlad and Niki":     "UCvlE5gTbOvjiolFlEm-c_Ow",
  "Stokes Twins":      "UCbp9MyKCTEww4CxEzc_Tp0Q",
  "Kids Diana Show":   "UCk8GzjMOrta8yxDcKfylJYw",
  "Like Nastya":       "UCJplp5SjeGSdVdwsfb9Q7lQ",
  "Zee Music Company": "UCFFbwnve3yF62-tVXkTyHqg",
  "5-Minute Crafts":   "UC295-Dw_tDNtZXFeAPAW6Aw",
  BLACKPINK:           "UCrDkAvocapwLoNZ_MhwFe3A",
  "Justin Bieber":     "UCIwFjwMjI0y7PDBVEO9-bkQ",
  "Mark Rober":        "UCY1kMZp36IQSyNx_9h4mpCg",
  "Dude Perfect":      "UCRijo3ddMTht_IHyNSNXpNQ",
  "Nicki Minaj":       "UCMMJBWA_h1B1v803oZxumiQ",
  Shakira:             "UCYLNGLIzMhRTi6ZOLjAPSmw",
  "ABP NEWS":          "UC1b0OBqgkJ_MTrOBm5JRBhA",
  BeatboxJCOP:         "UCdX5KXiCTPYWYZscfphgQ4g",
  "Toys and Colors":   "UCgFXm4TI8htWmCyJ6KiX9rQ",
  "Alan's Universe":   "UC5gxP-2QqIh_09djvlm9Xcg",
};

function fmt(n: string | number): string {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return "—";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export async function GET() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  const ids = Object.values(CHANNEL_IDS).join(",");

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids}&key=${key}&maxResults=50`,
      { next: { revalidate: 3600 } } // cache 1 hour
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("[YouTube creators] API error:", res.status, body.slice(0, 300));
      return NextResponse.json({ error: "YouTube API error" }, { status: 502 });
    }

    const data = await res.json();

    // Build a map: channelId → channel data
    const byId: Record<string, any> = {};
    for (const item of data.items ?? []) {
      byId[item.id] = item;
    }

    // Re-map in our creator order
    const result = Object.entries(CHANNEL_IDS).map(([name, id]) => {
      const ch = byId[id];
      if (!ch) return { name, id, thumbnail: "", subs: "—", views: "—", videos: "—", country: "" };
      return {
        name,
        id,
        realName: ch.snippet.title,
        thumbnail: ch.snippet.thumbnails?.high?.url ?? ch.snippet.thumbnails?.medium?.url ?? ch.snippet.thumbnails?.default?.url ?? "",
        subs: fmt(ch.statistics.subscriberCount ?? "0"),
        views: fmt(ch.statistics.viewCount ?? "0"),
        videos: fmt(ch.statistics.videoCount ?? "0"),
        country: ch.snippet.country ?? "",
      };
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("[YouTube creators] fetch error:", err);
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }
}

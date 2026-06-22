import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=6&q=${encodeURIComponent(q)}&key=${key}`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const results = (data.items ?? []).map((item: any) => ({
      channelId: item.id.channelId,
      name: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.default?.url ?? "",
      description: item.snippet.description?.slice(0, 80) ?? "",
    }));

    // fetch subscriber counts for all channels in one call
    const ids = results.map((r: any) => r.channelId).join(",");
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${ids}&key=${key}`,
      { cache: "no-store" }
    );
    if (statsRes.ok) {
      const stats = await statsRes.json();
      const statsMap: Record<string, string> = {};
      for (const ch of stats.items ?? []) {
        statsMap[ch.id] = ch.statistics?.subscriberCount ?? "0";
      }
      for (const r of results) {
        r.subscribers = statsMap[r.channelId] ?? "0";
      }
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}

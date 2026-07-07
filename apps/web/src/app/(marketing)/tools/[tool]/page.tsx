import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";
import { PRIVATE_ROBOTS } from "@/lib/seo";

// All tools that now have their own dedicated pages — redirect any catch-all hit to them
const LIVE_TOOLS: Record<string, string> = {
  "video-slicer":            "/tools/video-slicer",
  "format-converter":        "/tools/format-converter",
  "aspect-ratio-converter":  "/tools/aspect-ratio-converter",
  "audio-extractor":         "/tools/audio-extractor",
  "caption-generator":       "/tools/caption-generator",
  "caption-templates":       "/tools/caption-templates",
  "video-compressor":        "/tools/video-compressor",
  "thumbnail-extractor":     "/tools/thumbnail-extractor",
  "video-metadata":          "/tools/video-metadata",
  "gif-generator":           "/tools/gif-generator",
};

type Props = { params: Promise<{ tool: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  // If it's a live tool, this page will redirect — metadata doesn't matter
  if (LIVE_TOOLS[tool]) return {};
  const name = tool.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return {
    title: `${name} — Coming Soon | AutoClipr`,
    description: `${name} is coming soon to AutoClipr. Check back shortly.`,
    // noindex: catch-all "coming soon" pages are thin content — don't index them
    robots: PRIVATE_ROBOTS,
  };
}

export default async function ToolPage({ params }: Props) {
  const { tool } = await params;

  // Permanent redirect to the dedicated page if it now exists
  const livePath = LIVE_TOOLS[tool];
  if (livePath) redirect(livePath);

  const name = tool.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
        <Construction className="h-8 w-8 text-emerald-400" />
      </div>
      <h1 className="text-2xl font-bold text-white sm:text-3xl">{name}</h1>
      <p className="mt-3 max-w-md text-white/50">
        This tool is coming soon. We&apos;re building it — check back shortly.
      </p>
      <Link
        href="/tools"
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all tools
      </Link>
    </div>
  );
}

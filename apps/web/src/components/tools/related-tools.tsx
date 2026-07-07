import Link from "next/link";
import {
  Scissors, FileVideo, Maximize2, Music, Film, ImageIcon,
  Captions, FileArchive, Info, Type, ArrowRight,
} from "lucide-react";

const ALL_TOOLS = [
  { slug: "video-slicer",           label: "Video Slicer",           icon: Scissors,    color: "text-violet-400",  bg: "bg-violet-500/10" },
  { slug: "format-converter",       label: "Format Converter",       icon: FileVideo,   color: "text-sky-400",     bg: "bg-sky-500/10"    },
  { slug: "aspect-ratio-converter", label: "Aspect Ratio Converter", icon: Maximize2,   color: "text-orange-400",  bg: "bg-orange-500/10" },
  { slug: "audio-extractor",        label: "Audio Extractor",        icon: Music,       color: "text-emerald-400", bg: "bg-emerald-500/10"},
  { slug: "caption-generator",      label: "Caption Generator",      icon: Captions,    color: "text-pink-400",    bg: "bg-pink-500/10"   },
  { slug: "caption-templates",      label: "Caption Templates",      icon: Type,        color: "text-rose-400",    bg: "bg-rose-500/10"   },
  { slug: "video-compressor",       label: "Video Compressor",       icon: FileArchive, color: "text-yellow-400",  bg: "bg-yellow-500/10" },
  { slug: "thumbnail-extractor",    label: "Thumbnail Extractor",    icon: ImageIcon,   color: "text-cyan-400",    bg: "bg-cyan-500/10"   },
  { slug: "video-metadata",         label: "Metadata Viewer",        icon: Info,        color: "text-slate-400",   bg: "bg-slate-500/10"  },
  { slug: "gif-generator",          label: "GIF Generator",          icon: Film,        color: "text-amber-400",   bg: "bg-amber-500/10"  },
];

interface Props {
  /** slug of the current tool — excluded from the related list */
  current: string;
  /** max cards to show (default 4) */
  limit?: number;
}

export function RelatedTools({ current, limit = 4 }: Props) {
  const related = ALL_TOOLS.filter((t) => t.slug !== current).slice(0, limit);

  return (
    <section className="mt-16 border-t border-white/[0.06] pt-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">More Free Tools</p>
          <h2 className="mt-1 text-lg font-bold text-white">You might also need</h2>
        </div>
        <Link
          href="/tools"
          className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/40 transition hover:border-white/[0.14] hover:text-white/70"
        >
          All tools
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {related.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="group flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tool.bg}`}>
                <Icon className={`h-4 w-4 ${tool.color}`} />
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xs font-semibold leading-tight text-white/80 group-hover:text-white">
                  {tool.label}
                </p>
                <ArrowRight className="h-3 w-3 shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/50" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

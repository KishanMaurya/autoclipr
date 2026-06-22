import type { Metadata } from "next";
import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ tool: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  const name = tool.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return { title: `${name} — Free Tool` };
}

export default async function ToolPage({ params }: Props) {
  const { tool } = await params;
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

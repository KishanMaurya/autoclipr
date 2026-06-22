"use client";

import { useState } from "react";
import { Upload, Link2 } from "lucide-react";
import { UploadForm } from "@/components/dashboard/upload-form";
import { CreateFromUrl } from "@/components/dashboard/create-from-url";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "url", label: "From URL", icon: Link2 },
  { id: "file", label: "Upload File", icon: Upload },
] as const;

export default function UploadPage() {
  const [tab, setTab] = useState<"url" | "file">("url");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Create Viral Shorts</h1>
        <p className="text-muted-foreground">
          Paste any video URL or upload a file — AI handles analysis, clips, captions, and export.
        </p>
      </div>

      <div className="flex gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "create-selected"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "url" ? <CreateFromUrl /> : <UploadForm />}
    </div>
  );
}

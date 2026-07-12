"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileVideo, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiFetch, type VideoPipeline } from "@/lib/api";
import { formatPipelineError } from "@/lib/pipeline-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PIPELINE_POLL_MS = 3000;
const FILE_INPUT_ID = "autoclipr-video-upload";

function UploadDropIcon() {
  return (
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-glow">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 20h16" />
      </svg>
    </div>
  );
}

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing">("idle");
  const [pipeline, setPipeline] = useState<VideoPipeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== "idle";

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("video/")) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  }, [title]);

  function onFileSelected(f: File | undefined) {
    if (!f?.type.startsWith("video/")) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  useEffect(() => {
    if (phase !== "processing" || !pipeline?.video_id) return;

    const failed =
      pipeline.job?.status === "failed" || pipeline.status === "failed";
    const complete =
      pipeline.progress_percent >= 100 ||
      pipeline.status === "ready" ||
      pipeline.clips_created > 0;

    if (failed) {
      setError(formatPipelineError(pipeline.job?.error));
      setPhase("idle");
      return;
    }

    if (complete) {
      router.push(`/clips?video=${pipeline.video_id}`);
      router.refresh();
      return;
    }

    const interval = setInterval(async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await apiFetch<VideoPipeline>(
        `/api/v1/videos/${pipeline.video_id}/pipeline`,
        { token: session.access_token }
      );
      if (res.success && res.data) setPipeline(res.data);
    }, PIPELINE_POLL_MS);

    return () => clearInterval(interval);
  }, [phase, pipeline, router]);

  async function handleUpload() {
    if (!file || !title) return;
    setPhase("uploading");
    setError(null);
    setPipeline(null);
    setProgress(10);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Not authenticated");
      setPhase("idle");
      return;
    }

    const init = await apiFetch<{
      video_id: string;
      upload_url: string;
      storage_path: string;
    }>("/api/v1/videos/upload", {
      method: "POST",
      token: session.access_token,
      body: JSON.stringify({
        title,
        filename: file.name,
        mime_type: file.type,
        size: file.size,
      }),
    });

    if (!init.success || !init.data) {
      setError(init.error?.message ?? "Failed to init upload");
      setPhase("idle");
      return;
    }

    setProgress(30);

    try {
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setProgress(30 + Math.round((ev.loaded / ev.total) * 40));
          }
        };
        xhr.onload = () =>
          xhr.status < 300 ? resolve() : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", init.data!.upload_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch {
      setError("File upload failed. Check your connection and try again.");
      setPhase("idle");
      return;
    }

    setProgress(75);

    const complete = await apiFetch(`/api/v1/videos/${init.data.video_id}/complete`, {
      method: "POST",
      token: session.access_token,
    });

    if (!complete.success) {
      setError(complete.error?.message ?? "Failed to complete upload");
      setPhase("idle");
      return;
    }

    const poll = await apiFetch<VideoPipeline>(
      `/api/v1/videos/${init.data.video_id}/pipeline`,
      { token: session.access_token }
    );

    setPipeline(
      poll.success && poll.data
        ? poll.data
        : {
            video_id: init.data.video_id,
            title,
            status: "processing",
            source_url: null,
            current_step: null,
            steps: [],
            progress_percent: 5,
            clips_created: 0,
          }
    );
    setPhase("processing");
  }

  if (phase === "processing") {
    const isQueued = pipeline?.job?.status === "queued";
    const statusLabel = isQueued ? "Queued" : "Processing";
    const progress = pipeline?.progress_percent ?? (isQueued ? 2 : 5);
    const detail = isQueued
      ? (pipeline?.queue_hint ??
        "Waiting for a worker to start — this usually takes a few seconds.")
      : `${progress}% — analyzing, clipping, and adding captions`;

    return (
      <Card className="glass border-white/10">
        <CardContent className="space-y-4 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-emerald-400">{statusLabel}</p>
              <h2 className="text-xl font-bold">{pipeline?.title ?? title}</h2>
            </div>
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-right text-xs text-muted-foreground">{detail}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass relative overflow-hidden border-white/10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-violet-500/[0.08] blur-3xl" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
            <FileVideo className="h-5 w-5 text-violet-400" />
            <span className="absolute -inset-1 -z-10 rounded-xl bg-violet-500/20 blur-md" />
          </span>
          Upload Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <input
          id={FILE_INPUT_ID}
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          disabled={busy}
          tabIndex={-1}
          onChange={(e) => {
            onFileSelected(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <label
          htmlFor={busy ? undefined : FILE_INPUT_ID}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={cn(
            "group/drop flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/5 px-6 py-16 text-center transition-all duration-300",
            busy
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:shadow-[inset_0_0_40px_-12px_rgba(52,211,153,0.15)]",
          )}
        >
          <div className="transition-transform duration-300 group-hover/drop:-translate-y-1 group-hover/drop:scale-105">
            <UploadDropIcon />
          </div>
          <p className="text-sm text-muted-foreground">
            Drag & drop your video, or{" "}
            <span className="font-medium text-emerald-400">browse</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Click anywhere in this area to choose a file
          </p>
          {file && (
            <p className="mt-2 text-sm font-medium">
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
        </label>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome video"
          />
        </div>

        {phase === "uploading" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          variant="gradient"
          className="w-full"
          disabled={!file || !title || busy}
          onClick={handleUpload}
        >
          {phase === "uploading" ? "Uploading…" : "Upload & Process"}
        </Button>
      </CardContent>
    </Card>
  );
}

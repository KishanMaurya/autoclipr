"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, Download, FileVideo, Zap, ShieldCheck, Globe,
  Loader2, AlertCircle, X, RefreshCw, Info, ChevronDown,
  Settings2, Gauge, BarChart3, Minimize2, CheckCircle,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "ready" | "processing" | "done" | "error";

interface CompressOpts {
  mode: "quality" | "filesize" | "bitrate";
  // quality mode
  crf: number;
  codec: "h264" | "h265" | "vp9";
  // filesize mode (MB)
  targetMB: number;
  // bitrate mode (kbps)
  videoBitrate: number;
  audioBitrate: "192k" | "128k" | "96k" | "64k" | "remove";
  resolution: "original" | "1080p" | "720p" | "480p" | "360p";
  fps: "original" | "60" | "30" | "24";
  twoPass: boolean;
  outputFormat: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(b: number, decimals = 1): string {
  if (b === 0) return "0 B";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(decimals)} MB`;
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function compressionColor(pct: number): string {
  if (pct >= 70) return "text-emerald-400";
  if (pct >= 40) return "text-yellow-400";
  return "text-orange-400";
}

function crfQualityLabel(crf: number, codec: string): string {
  const max = codec === "h265" || codec === "vp9" ? 51 : 51;
  const pct = 1 - crf / max;
  if (pct > 0.8) return "Visually lossless";
  if (pct > 0.65) return "High quality";
  if (pct > 0.5) return "Balanced";
  if (pct > 0.35) return "Small file";
  return "Very compressed";
}

const PRESETS = [
  { label: "Web",         crf: 28, desc: "Good for streaming and web players" },
  { label: "Social",      crf: 30, desc: "TikTok, Reels, Twitter uploads" },
  { label: "Email",       crf: 34, desc: "Small file for email attachment" },
  { label: "Archive",     crf: 22, desc: "High quality storage" },
  { label: "WhatsApp",    crf: 36, desc: "Under 16 MB for WhatsApp" },
];

const RESOLUTIONS: { label: string; value: CompressOpts["resolution"]; w?: number; h?: number }[] = [
  { label: "Original",  value: "original" },
  { label: "1080p",     value: "1080p", w: 1920, h: 1080 },
  { label: "720p",      value: "720p",  w: 1280, h: 720  },
  { label: "480p",      value: "480p",  w: 854,  h: 480  },
  { label: "360p",      value: "360p",  w: 640,  h: 360  },
];

const DEFAULT_OPTS: CompressOpts = {
  mode: "quality",
  crf: 28,
  codec: "h264",
  targetMB: 50,
  videoBitrate: 2000,
  audioBitrate: "128k",
  resolution: "original",
  fps: "original",
  twoPass: false,
  outputFormat: "mp4",
};

// ─── FFmpeg args builder ──────────────────────────────────────────────────────

function buildArgs(
  inName: string,
  outName: string,
  opts: CompressOpts,
  vw: number,
  vh: number,
  dur: number,
): string[] {
  const args: string[] = ["-y", "-i", inName];

  // Video filters
  const filters: string[] = [];
  if (opts.fps !== "original") filters.push(`fps=${opts.fps}`);

  // Resolution scale (preserve aspect ratio)
  if (opts.resolution !== "original") {
    const res = RESOLUTIONS.find(r => r.value === opts.resolution);
    if (res?.w && res?.h) {
      // Scale down only if source is larger
      if (vw > res.w || vh > res.h) {
        filters.push(`scale='min(${res.w},iw)':'min(${res.h},ih)':force_original_aspect_ratio=decrease`);
        filters.push(`pad=${res.w}:${res.h}:(ow-iw)/2:(oh-ih)/2`);
      }
    }
  }

  if (filters.length > 0) args.push("-vf", filters.join(","));

  // Codec + rate control
  if (opts.codec === "h265") {
    args.push("-c:v", "libx265", "-preset", "ultrafast", "-tag:v", "hvc1");
    if (opts.mode === "quality") args.push("-crf", String(opts.crf));
    else if (opts.mode === "bitrate") args.push("-b:v", `${opts.videoBitrate}k`);
    else {
      // filesize mode — compute bitrate from target
      const totalBits = opts.targetMB * 8 * 1024 * 1024;
      const audioBits = opts.audioBitrate === "remove" ? 0 : parseInt(opts.audioBitrate) * 1000;
      const vBitrate = Math.max(100, Math.floor((totalBits - audioBits * dur) / dur / 1000));
      args.push("-b:v", `${vBitrate}k`);
    }
  } else if (opts.codec === "vp9") {
    args.push("-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8");
    if (opts.mode === "quality") args.push("-crf", String(opts.crf), "-b:v", "0");
    else if (opts.mode === "bitrate") args.push("-b:v", `${opts.videoBitrate}k`);
    else {
      const totalBits = opts.targetMB * 8 * 1024 * 1024;
      const audioBits = opts.audioBitrate === "remove" ? 0 : parseInt(opts.audioBitrate) * 1000;
      const vBitrate = Math.max(100, Math.floor((totalBits - audioBits * dur) / dur / 1000));
      args.push("-b:v", `${vBitrate}k`);
    }
  } else {
    // H.264 default
    args.push("-c:v", "libx264", "-preset", "ultrafast");
    if (opts.mode === "quality") args.push("-crf", String(opts.crf));
    else if (opts.mode === "bitrate") args.push("-b:v", `${opts.videoBitrate}k`);
    else {
      const totalBits = opts.targetMB * 8 * 1024 * 1024;
      const audioBits = opts.audioBitrate === "remove" ? 0 : parseInt(opts.audioBitrate) * 1000;
      const vBitrate = Math.max(100, Math.floor((totalBits - audioBits * dur) / dur / 1000));
      args.push("-b:v", `${vBitrate}k`);
    }
  }

  // Audio
  if (opts.audioBitrate === "remove") {
    args.push("-an");
  } else if (opts.codec === "vp9") {
    args.push("-c:a", "libopus", "-b:a", opts.audioBitrate);
  } else {
    args.push("-c:a", "aac", "-b:a", opts.audioBitrate);
  }

  args.push(outName);
  return args;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoCompressor() {
  const [stage, setStage]             = useState<Stage>("idle");
  const [file, setFile]               = useState<File | null>(null);
  const [videoUrl, setVideoUrl]       = useState<string | null>(null);
  const [videoDims, setVideoDims]     = useState({ w: 0, h: 0, dur: 0 });
  const [opts, setOpts]               = useState<CompressOpts>(DEFAULT_OPTS);
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]             = useState("");
  const [dragging, setDragging]       = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [outputUrl, setOutputUrl]     = useState<string | null>(null);
  const [outputSize, setOutputSize]   = useState(0);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffLoaded  = useRef(false);
  const fileRef   = useRef<HTMLInputElement>(null);

  const ACCEPT = "video/*,.mp4,.webm,.mov,.avi,.mkv,.flv,.wmv,.m4v,.3gp,.ts,.mts";
  const setOpt = <K extends keyof CompressOpts>(k: K, v: CompressOpts[K]) =>
    setOpts(o => ({ ...o, [k]: v }));

  const compressionPct = outputSize > 0 && file
    ? Math.round((1 - outputSize / file.size) * 100)
    : 0;

  // Estimated output size for quality mode
  const estimatedMB = (() => {
    if (!file || videoDims.dur === 0) return null;
    if (opts.mode === "filesize") return opts.targetMB;
    if (opts.mode === "bitrate") {
      const vBits = opts.videoBitrate * 1000;
      const aBits = opts.audioBitrate === "remove" ? 0 : parseInt(opts.audioBitrate) * 1000;
      return ((vBits + aBits) * videoDims.dur / 8 / 1024 / 1024);
    }
    // quality mode: rough estimate based on CRF
    const crfFactor = Math.pow(0.85, opts.crf - 18);
    return (file.size / 1024 / 1024) * crfFactor * 0.7;
  })();

  // ── FFmpeg loader ──
  const loadFFmpeg = useCallback(async () => {
    if (ffLoaded.current) return ffmpegRef.current!;
    const ff = new FFmpeg();
    const baseURL = "/ffmpeg";
    const workerURL = `${baseURL}/ffmpeg-worker.js`;
    const coreURL   = `${baseURL}/ffmpeg-core-umd.js`;
    const wasmURL   = `${baseURL}/ffmpeg-core-umd.wasm`;
    const OrigWorker = window.Worker;
    (window as any).Worker = class extends OrigWorker {
      constructor(url: string | URL, wopts?: WorkerOptions) {
        super(typeof url === "string" && url.includes("ffmpeg-core") ? workerURL : url, { ...wopts, type: "classic" });
      }
    };
    await ff.load({ coreURL, wasmURL });
    (window as any).Worker = OrigWorker;
    ff.on("progress", ({ progress: p }) => setProgress(Math.round(10 + p * 86)));
    ffmpegRef.current = ff;
    ffLoaded.current  = true;
    return ff;
  }, []);

  // ── File pick ──
  const pickFile = (f: File) => {
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setStage("ready");
    setOutputUrl(null); setError("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) pickFile(f);
  }, []);

  const onMeta = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    setVideoDims({ w: v.videoWidth, h: v.videoHeight, dur: v.duration });
  };

  // ── Compress ──
  const compress = async () => {
    if (!file) return;
    setStage("processing"); setProgress(5);
    setOutputUrl(null); setError("");

    try {
      setProgressMsg("Loading FFmpeg…");
      const ff = await loadFFmpeg();
      setProgress(10);

      const ext    = file.name.split(".").pop() ?? "mp4";
      const inName = `input.${ext}`;
      const outName = `output.${opts.outputFormat}`;

      setProgressMsg("Reading video…");
      await ff.writeFile(inName, await fetchFile(file));
      setProgress(15);
      setProgressMsg(`Compressing with ${opts.codec.toUpperCase()}…`);

      const ffArgs = buildArgs(inName, outName, opts, videoDims.w, videoDims.h, videoDims.dur);
      const ret = await ff.exec(ffArgs);
      if (ret !== 0) throw new Error("Compression failed — try a different codec or lower quality setting.");

      const data = await ff.readFile(outName) as Uint8Array;
      try { await ff.deleteFile(inName); await ff.deleteFile(outName); } catch { /* ok */ }

      const mime = opts.outputFormat === "webm" ? "video/webm" : "video/mp4";
      const blob = new Blob([data.buffer as ArrayBuffer], { type: mime });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStage("done");
    } catch (e: any) {
      setError(e?.message ?? "Compression failed.");
      setStage("error");
    }
  };

  const download = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `${file?.name.replace(/\.[^.]+$/, "") ?? "video"}_compressed.${opts.outputFormat}`;
    a.click();
  };

  const reset = () => {
    setStage("idle"); setFile(null); setVideoUrl(null);
    setOutputUrl(null); setError(""); setProgress(0);
    setVideoDims({ w: 0, h: 0, dur: 0 });
  };

  return (
    <div className="min-h-screen bg-[#07080f] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* ── Header ── */}
        <div className="mb-8">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Tools
          </Link>
          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
              <Minimize2 className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold sm:text-3xl">Video Compressor</h1>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">Free</span>
              </div>
              <p className="mt-1 text-white/50 text-sm">Reduce video file size without losing quality. H.264, H.265, VP9. MP4, MOV, AVI, MKV, WebM and more.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: <ShieldCheck className="h-3 w-3" />, label: "100% Private" },
              { icon: <Globe       className="h-3 w-3" />, label: "No Upload" },
              { icon: <Zap         className="h-3 w-3" />, label: "Browser-side" },
              { icon: <Gauge       className="h-3 w-3" />, label: "H.264 · H.265 · VP9" },
            ].map(p => (
              <span key={p.label} className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-white/50">
                {p.icon}{p.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Drop zone ── */}
        {stage === "idle" && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative flex cursor-pointer flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed py-24 transition-all
              ${dragging ? "border-amber-400 bg-amber-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"}`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white">Drop your video here</p>
              <p className="mt-1 text-sm text-white/40">MP4, MOV, AVI, MKV, WebM, FLV, TS, 3GP…</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["MP4","MOV","AVI","MKV","WebM","FLV","TS","3GP","WMV","M4V"].map(f => (
                <span key={f} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/30">{f}</span>
              ))}
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          </div>
        )}

        {/* ── Workspace ── */}
        {stage !== "idle" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">

            {/* Left */}
            <div className="space-y-4">

              {/* File bar */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <FileVideo className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{file?.name}</p>
                  <p className="text-xs text-white/40">
                    {fmtBytes(file?.size ?? 0)} · {videoDims.dur > 0 ? fmtTime(videoDims.dur) : "—"}{videoDims.w > 0 ? ` · ${videoDims.w}×${videoDims.h}` : ""}
                  </p>
                </div>
                <button onClick={reset} className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white/70 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Video preview */}
              {videoUrl && (
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
                  <video src={videoUrl} controls className="w-full max-h-64" onLoadedMetadata={onMeta} />
                </div>
              )}

              {/* Estimated size card */}
              {stage === "ready" && file && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                    <p className="text-xs text-white/30 mb-1">Original size</p>
                    <p className="text-2xl font-bold text-white">{fmtBytes(file.size)}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
                    <p className="text-xs text-white/30 mb-1">Est. output size</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {estimatedMB != null ? `~${estimatedMB < 1 ? `${Math.round(estimatedMB * 1024)} KB` : `${estimatedMB.toFixed(1)} MB`}` : "—"}
                    </p>
                  </div>
                </div>
              )}

              {/* Progress */}
              {stage === "processing" && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                    <p className="font-semibold text-white">{progressMsg}</p>
                  </div>
                  {/* Animated bar */}
                  <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                      style={{ width: `${progress}%` }} />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 to-transparent animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/30">
                    <span>{progress}% complete</span>
                    <span>{opts.codec.toUpperCase()} · CRF {opts.crf}</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {stage === "error" && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-300">Compression failed</p>
                    <p className="mt-1 text-sm text-red-300/70">{error}</p>
                  </div>
                </div>
              )}

              {/* Done */}
              {stage === "done" && outputUrl && (
                <div className="space-y-4">
                  {/* Result stats */}
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      <p className="font-semibold text-emerald-300">Compression complete</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-center">
                        <p className="text-sm font-bold text-white">{fmtBytes(file?.size ?? 0)}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">Original</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-center">
                        <p className="text-sm font-bold text-white">{fmtBytes(outputSize)}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">Compressed</p>
                      </div>
                      <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center">
                        <p className={`text-sm font-bold ${compressionColor(compressionPct)}`}>
                          {compressionPct > 0 ? `-${compressionPct}%` : `+${Math.abs(compressionPct)}%`}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">Saved</p>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
                        <span>Original</span>
                        <span>Compressed ({compressionPct}% smaller)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                          style={{ width: `${Math.max(5, 100 - compressionPct)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Output preview */}
                  <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
                    <video src={outputUrl} controls className="w-full max-h-56" />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={download}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 py-4 text-sm font-bold text-white transition hover:from-amber-500 hover:to-orange-500 active:scale-[0.98]">
                      <Download className="h-4 w-4" /> Download {opts.outputFormat.toUpperCase()} · {fmtBytes(outputSize)}
                    </button>
                    <button onClick={() => setStage("ready")}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm text-white/50 hover:text-white transition-colors flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right — settings */}
            <div className="space-y-4">

              {/* Quick presets */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Quick Presets</p>
                <div className="grid grid-cols-1 gap-2">
                  {PRESETS.map(p => (
                    <button key={p.label}
                      onClick={() => { setOpt("crf", p.crf); setOpt("mode", "quality"); }}
                      className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-left transition-all
                        ${opts.mode === "quality" && opts.crf === p.crf
                          ? "border-amber-500/50 bg-amber-500/10"
                          : "border-white/[0.06] hover:border-white/10"}`}>
                      <div>
                        <p className={`text-sm font-semibold ${opts.mode === "quality" && opts.crf === p.crf ? "text-amber-300" : "text-white/70"}`}>
                          {p.label}
                        </p>
                        <p className="text-[10px] text-white/30">{p.desc}</p>
                      </div>
                      <span className={`text-xs font-mono ${opts.mode === "quality" && opts.crf === p.crf ? "text-amber-400" : "text-white/20"}`}>
                        CRF {p.crf}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode selector */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Compression Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "quality",  label: "Quality",   desc: "CRF" },
                    { id: "filesize", label: "File size",  desc: "MB" },
                    { id: "bitrate",  label: "Bitrate",   desc: "kbps" },
                  ] as const).map(m => (
                    <button key={m.id} onClick={() => setOpt("mode", m.id)}
                      className={`rounded-xl border px-2 py-2.5 text-center transition-all
                        ${opts.mode === m.id ? "border-amber-500/50 bg-amber-500/10" : "border-white/[0.06] hover:border-white/10"}`}>
                      <p className={`text-xs font-semibold ${opts.mode === m.id ? "text-amber-300" : "text-white/50"}`}>{m.label}</p>
                      <p className="text-[9px] text-white/25 mt-0.5">{m.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Quality slider */}
                {opts.mode === "quality" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-white/40">CRF (Quality)</p>
                      <span className="text-xs text-amber-400 font-mono">CRF {opts.crf} — {crfQualityLabel(opts.crf, opts.codec)}</span>
                    </div>
                    <input type="range" min={opts.codec === "h265" || opts.codec === "vp9" ? 20 : 18} max={51} step={1}
                      value={opts.crf} onChange={e => setOpt("crf", +e.target.value)}
                      className="w-full accent-amber-500" />
                    <div className="flex justify-between text-[10px] text-white/20 mt-1">
                      <span>Best quality</span>
                      <span>Smallest size</span>
                    </div>
                  </div>
                )}

                {/* File size target */}
                {opts.mode === "filesize" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-white/40">Target file size</p>
                      <span className="text-xs text-amber-400 font-mono">{opts.targetMB} MB</span>
                    </div>
                    <input type="range" min={1} max={Math.max(500, Math.ceil((file?.size ?? 0) / 1024 / 1024))}
                      step={1} value={opts.targetMB} onChange={e => setOpt("targetMB", +e.target.value)}
                      className="w-full accent-amber-500" />
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {[8, 16, 50, 100].map(mb => (
                        <button key={mb} onClick={() => setOpt("targetMB", mb)}
                          className={`rounded-lg border py-1 text-[10px] font-semibold transition-all
                            ${opts.targetMB === mb ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/[0.06] text-white/30 hover:text-white/60"}`}>
                          {mb} MB
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bitrate */}
                {opts.mode === "bitrate" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-white/40">Video bitrate</p>
                      <span className="text-xs text-amber-400 font-mono">{opts.videoBitrate} kbps</span>
                    </div>
                    <input type="range" min={100} max={10000} step={100}
                      value={opts.videoBitrate} onChange={e => setOpt("videoBitrate", +e.target.value)}
                      className="w-full accent-amber-500" />
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      {[500, 1000, 2500, 5000].map(k => (
                        <button key={k} onClick={() => setOpt("videoBitrate", k)}
                          className={`rounded-lg border py-1 text-[10px] font-semibold transition-all
                            ${opts.videoBitrate === k ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/[0.06] text-white/30 hover:text-white/60"}`}>
                          {k >= 1000 ? `${k / 1000}M` : `${k}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Codec */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Video Codec</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "h264", label: "H.264",  desc: "Fast · Universal" },
                    { id: "h265", label: "H.265",  desc: "50% smaller · Slower" },
                    { id: "vp9",  label: "VP9",    desc: "Open · WebM" },
                  ] as const).map(c => (
                    <button key={c.id} onClick={() => setOpt("codec", c.id)}
                      className={`rounded-xl border px-2 py-2.5 text-center transition-all
                        ${opts.codec === c.id ? "border-amber-500/50 bg-amber-500/10" : "border-white/[0.06] hover:border-white/10"}`}>
                      <p className={`text-xs font-bold ${opts.codec === c.id ? "text-amber-300" : "text-white/60"}`}>{c.label}</p>
                      <p className="text-[9px] text-white/25 mt-0.5 leading-tight">{c.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <button onClick={() => setShowAdvanced(a => !a)}
                  className="flex w-full items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
                  <Settings2 className="h-3.5 w-3.5" />
                  Advanced options
                  <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </button>

                {showAdvanced && (
                  <div className="space-y-4 border-t border-white/[0.06] pt-4">
                    {/* Resolution */}
                    <div>
                      <p className="mb-2 text-xs text-white/40">Resolution</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {RESOLUTIONS.map(r => (
                          <button key={r.value} onClick={() => setOpt("resolution", r.value)}
                            className={`rounded-xl border py-2 text-[10px] font-semibold transition-all
                              ${opts.resolution === r.value ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* FPS */}
                    <div>
                      <p className="mb-2 text-xs text-white/40">Frame Rate</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["original", "60", "30", "24"] as const).map(f => (
                          <button key={f} onClick={() => setOpt("fps", f)}
                            className={`rounded-xl border py-2 text-[10px] font-semibold transition-all
                              ${opts.fps === f ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                            {f === "original" ? "Orig." : `${f} fps`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Audio bitrate */}
                    <div>
                      <p className="mb-2 text-xs text-white/40">Audio Bitrate</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {(["192k", "128k", "96k", "64k", "remove"] as const).map(b => (
                          <button key={b} onClick={() => setOpt("audioBitrate", b)}
                            className={`rounded-xl border py-2 text-[10px] font-semibold transition-all
                              ${opts.audioBitrate === b
                                ? b === "remove" ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-amber-500/50 bg-amber-500/10 text-amber-300"
                                : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                            {b === "remove" ? "Mute" : b}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Output format */}
                    <div>
                      <p className="mb-2 text-xs text-white/40">Output Format</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {["mp4", "webm", "mov", "mkv"].map(f => (
                          <button key={f} onClick={() => setOpt("outputFormat", f)}
                            className={`rounded-xl border py-2 text-[10px] font-bold uppercase transition-all
                              ${opts.outputFormat === f ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Compress button */}
              {(stage === "ready" || stage === "error") && (
                <button onClick={compress}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 py-4 text-sm font-bold text-white transition hover:from-amber-500 hover:to-orange-500 active:scale-[0.98] flex items-center justify-center gap-2">
                  <Minimize2 className="h-4 w-4" />
                  Compress Video
                  {estimatedMB != null && (
                    <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                      ~{estimatedMB < 1 ? `${Math.round(estimatedMB * 1024)} KB` : `${estimatedMB.toFixed(0)} MB`}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Codec comparison ── */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { codec: "H.264",  color: "text-blue-400",    bg: "bg-blue-500/10",   border: "border-blue-500/20",   pros: ["Universal support", "Fast encoding", "Works everywhere"], cons: ["Larger files vs H.265"] },
            { codec: "H.265",  color: "text-purple-400",  bg: "bg-purple-500/10", border: "border-purple-500/20", pros: ["50% smaller than H.264", "Same visual quality", "Great for 4K"], cons: ["Slower to encode"] },
            { codec: "VP9",    color: "text-emerald-400", bg: "bg-emerald-500/10",border: "border-emerald-500/20",pros: ["Open source & free", "Great for web", "YouTube uses VP9"], cons: ["Limited device support"] },
          ].map(c => (
            <div key={c.codec} className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
              <p className={`font-bold text-base ${c.color} mb-3`}>{c.codec}</p>
              <div className="space-y-1">
                {c.pros.map(p => (
                  <p key={p} className="text-xs text-white/60 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-emerald-400 shrink-0" />{p}
                  </p>
                ))}
                {c.cons.map(p => (
                  <p key={p} className="text-xs text-white/30 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-white/20 shrink-0" />{p}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Feature cards ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: <Gauge      className="h-5 w-5 text-amber-400"  />, title: "3 Compression Modes", body: "Quality (CRF), target file size, or exact bitrate — pick the approach that fits your use case." },
            { icon: <BarChart3  className="h-5 w-5 text-orange-400" />, title: "Live Size Estimate",   body: "See the estimated output file size before you compress, based on your settings." },
            { icon: <Minimize2  className="h-5 w-5 text-yellow-400" />, title: "Up to 90% smaller",    body: "Combine codec choice, CRF and resolution downscaling for dramatic file size reductions." },
          ].map(c => (
            <div key={c.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">{c.icon}</div>
              <p className="font-semibold text-white">{c.title}</p>
              <p className="mt-1 text-sm text-white/40">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-blue-500/15 bg-blue-500/5 px-5 py-4 flex items-start gap-3">
          <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
          <p className="text-xs text-blue-300/70 leading-relaxed">
            <span className="font-semibold text-blue-300">Processing is 100% in-browser.</span>{" "}
            Your video never leaves your device. H.265 produces the smallest files but takes longer in WebAssembly — use H.264 for fastest results.
          </p>
        </div>
      </div>
    </div>
  );
}

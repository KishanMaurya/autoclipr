"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, Download, FileVideo, Zap, ShieldCheck, Globe,
  RefreshCw, ChevronDown, CheckCircle, AlertCircle, Loader2,
  Settings2, Music, ImageIcon, Film, Volume2, VolumeX, Play,
  ArrowRight, X, Info,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "ready" | "converting" | "done" | "error";

interface FormatOption {
  ext: string;
  label: string;
  mime: string;
  category: "video" | "audio" | "image";
  description: string;
  codec?: string[];
}

interface ConvertOpts {
  outputFormat: string;
  quality: "lossless" | "high" | "medium" | "compressed";
  resolution: "original" | "4k" | "1080p" | "720p" | "480p" | "360p";
  fps: "original" | "60" | "30" | "24" | "15" | "10";
  muteAudio: boolean;
  audioBitrate: "320k" | "192k" | "128k" | "96k" | "64k";
  videoCodec: "auto" | "libx264" | "libx265" | "libvpx-vp9" | "libaom-av1";
  trimStart: number;
  trimEnd: number;
  useTrim: boolean;
  stripMetadata: boolean;
}

// ─── Format catalogue ─────────────────────────────────────────────────────────

const FORMATS: FormatOption[] = [
  { ext: "mp4",  label: "MP4",  mime: "video/mp4",       category: "video", description: "Universal — works everywhere" },
  { ext: "webm", label: "WebM", mime: "video/webm",      category: "video", description: "Web-optimised, open format" },
  { ext: "mov",  label: "MOV",  mime: "video/quicktime", category: "video", description: "Apple QuickTime" },
  { ext: "avi",  label: "AVI",  mime: "video/avi",       category: "video", description: "Classic Windows format" },
  { ext: "mkv",  label: "MKV",  mime: "video/x-matroska",category: "video", description: "Matroska container" },
  { ext: "gif",  label: "GIF",  mime: "image/gif",       category: "image", description: "Animated image, no audio" },
  { ext: "mp3",  label: "MP3",  mime: "audio/mpeg",      category: "audio", description: "Extract audio as MP3" },
  { ext: "m4a",  label: "M4A",  mime: "audio/mp4",       category: "audio", description: "Extract audio as AAC/M4A" },
  { ext: "wav",  label: "WAV",  mime: "audio/wav",       category: "audio", description: "Lossless audio" },
  { ext: "ogg",  label: "OGG",  mime: "audio/ogg",       category: "audio", description: "Open audio format" },
];

const ACCEPT = "video/*,audio/*,.mp4,.webm,.mov,.avi,.mkv,.flv,.wmv,.m4v,.3gp,.ts,.mts,.m2ts,.ogv";

const DEFAULT_OPTS: ConvertOpts = {
  outputFormat: "mp4",
  quality: "high",
  resolution: "original",
  fps: "original",
  muteAudio: false,
  audioBitrate: "128k",
  videoCodec: "auto",
  trimStart: 0,
  trimEnd: 0,
  useTrim: false,
  stripMetadata: false,
};

// ─── FFmpeg builder ────────────────────────────────────────────────────────────

function buildArgs(inName: string, outName: string, opts: ConvertOpts, duration: number): string[] {
  const { outputFormat, quality, resolution, fps, muteAudio, audioBitrate,
          videoCodec, trimStart, trimEnd, useTrim, stripMetadata } = opts;

  const args: string[] = ["-y"];

  if (useTrim && trimEnd > trimStart) {
    args.push("-ss", trimStart.toFixed(3), "-to", trimEnd.toFixed(3));
  }

  args.push("-i", inName);

  const isAudioOnly = ["mp3", "m4a", "wav", "ogg"].includes(outputFormat);
  const isGif       = outputFormat === "gif";

  if (isAudioOnly) {
    if (outputFormat === "mp3") args.push("-c:a", "libmp3lame", "-b:a", audioBitrate, "-vn");
    else if (outputFormat === "m4a") args.push("-c:a", "aac", "-b:a", audioBitrate, "-vn");
    else if (outputFormat === "wav") args.push("-c:a", "pcm_s16le", "-vn");
    else if (outputFormat === "ogg") args.push("-c:a", "libvorbis", "-b:a", audioBitrate, "-vn");
    args.push(outName);
    return args;
  }

  if (isGif) {
    const gifScale = resolution === "original" ? "480:-1" :
      resolution === "1080p" ? "960:-1" : resolution === "720p" ? "640:-1" :
      resolution === "480p"  ? "480:-1" : resolution === "360p" ? "360:-1" : "480:-1";
    const gifFps = fps === "original" ? "10" : fps;
    args.push("-vf", `fps=${gifFps},scale=${gifScale}:flags=lanczos`, "-loop", "0", outName);
    return args;
  }

  // Video filters
  const vfParts: string[] = [];

  if (resolution !== "original") {
    const h = { "4k": 2160, "1080p": 1080, "720p": 720, "480p": 480, "360p": 360 }[resolution]!;
    vfParts.push(`scale=-2:${h}`);
  }
  if (fps !== "original") vfParts.push(`fps=${fps}`);
  if (vfParts.length) args.push("-vf", vfParts.join(","));

  // Video codec + quality
  const crfMap = { lossless: "0", high: "18", medium: "23", compressed: "28" };
  const crf = crfMap[quality];

  const resolvedCodec = videoCodec !== "auto" ? videoCodec :
    outputFormat === "webm" ? "libvpx-vp9" :
    outputFormat === "avi"  ? "libx264"    :
    outputFormat === "mov"  ? "libx264"    :
    outputFormat === "mkv"  ? "libx264"    : "libx264";

  if (resolvedCodec === "libvpx-vp9") {
    args.push("-c:v", "libvpx-vp9", "-crf", crf, "-b:v", "0");
  } else if (resolvedCodec === "libx265") {
    args.push("-c:v", "libx265", "-crf", crf, "-preset", "fast", "-pix_fmt", "yuv420p");
  } else {
    args.push("-c:v", "libx264", "-crf", crf, "-preset", "fast", "-pix_fmt", "yuv420p");
  }

  if (muteAudio) {
    args.push("-an");
  } else {
    if (outputFormat === "webm") args.push("-c:a", "libopus", "-b:a", audioBitrate);
    else args.push("-c:a", "aac", "-b:a", audioBitrate);
  }

  if (stripMetadata) args.push("-map_metadata", "-1");

  // MOV needs movflags for streaming
  if (outputFormat === "mov" || outputFormat === "mp4") {
    args.push("-movflags", "+faststart");
  }

  args.push(outName);
  return args;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function categoryIcon(cat: FormatOption["category"]) {
  if (cat === "audio") return <Music className="h-3.5 w-3.5" />;
  if (cat === "image") return <ImageIcon className="h-3.5 w-3.5" />;
  return <Film className="h-3.5 w-3.5" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FormatConverter() {
  const [stage, setStage]         = useState<Stage>("idle");
  const [file, setFile]           = useState<File | null>(null);
  const [videoUrl, setVideoUrl]   = useState<string | null>(null);
  const [duration, setDuration]   = useState(0);
  const [opts, setOpts]           = useState<ConvertOpts>(DEFAULT_OPTS);
  const [progress, setProgress]   = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]         = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState(0);
  const [inputSize, setInputSize] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const [convertTime, setConvertTime] = useState(0);

  const ffmpegRef  = useRef<FFmpeg | null>(null);
  const ffLoaded   = useRef(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const startRef   = useRef(0);

  const setOpt = <K extends keyof ConvertOpts>(k: K, v: ConvertOpts[K]) =>
    setOpts(o => ({ ...o, [k]: v }));

  // ── FFmpeg loader ──
  const loadFFmpeg = useCallback(async () => {
    if (ffLoaded.current) return ffmpegRef.current!;
    const ff = new FFmpeg();
    (ff as any).on("log", ({ message }: { message: string }) => {
      if (message.includes("time=")) {
        const t = message.split("time=")[1]?.split(" ")[0] ?? "";
        setProgressMsg(`Encoding… ${t}`);
      }
    });
    (ff as any).on("progress", ({ progress: p }: { progress: number }) => {
      setProgress(Math.min(99, Math.round(p * 100)));
    });

    const baseURL = "/ffmpeg";
    const workerURL = `${baseURL}/ffmpeg-worker.js`;
    const coreURL   = `${baseURL}/ffmpeg-core-umd.js`;
    const wasmURL   = `${baseURL}/ffmpeg-core-umd.wasm`;

    const OrigWorker = window.Worker;
    (window as any).Worker = class extends OrigWorker {
      constructor(url: string | URL, opts?: WorkerOptions) {
        super(typeof url === "string" && url.includes("ffmpeg-core") ? workerURL : url, { ...opts, type: "classic" });
      }
    };

    await ff.load({ coreURL, wasmURL });
    (window as any).Worker = OrigWorker;

    ffmpegRef.current = ff;
    ffLoaded.current  = true;
    return ff;
  }, []);

  // ── File pick ──
  const pickFile = (f: File) => {
    setFile(f);
    setInputSize(f.size);
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
    setStage("ready");
    setOutputUrl(null);
    setError("");
    setProgress(0);
    setOpts(o => ({ ...o, useTrim: false, trimStart: 0, trimEnd: 0 }));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  // ── Duration from video ──
  const onLoadedMeta = () => {
    const v = videoRef.current; if (!v) return;
    setDuration(v.duration);
    setOpts(o => ({ ...o, trimEnd: v.duration }));
  };

  // ── Convert ──
  const convert = async () => {
    if (!file) return;
    setStage("converting");
    setProgress(0);
    setProgressMsg("Loading FFmpeg…");
    startRef.current = Date.now();

    try {
      const ff = await loadFFmpeg();
      const ext = file.name.split(".").pop() ?? "mp4";
      const inName  = `input.${ext}`;
      const outName = `output.${opts.outputFormat}`;

      setProgressMsg("Reading file…");
      await ff.writeFile(inName, await fetchFile(file));
      try { await ff.deleteFile(outName); } catch { /* ok */ }

      setProgressMsg("Converting…");
      const args = buildArgs(inName, outName, opts, duration);
      const logs: string[] = [];
      (ff as any).on("log", ({ message }: { message: string }) => logs.push(message));

      const ret = await ff.exec(args);

      if (ret !== 0) {
        const errLines = logs.filter(l => /error|invalid|unable/i.test(l)).slice(-3);
        throw new Error(errLines.length ? errLines.join(" | ") : "Conversion failed. Try a different format.");
      }

      const data = await ff.readFile(outName) as Uint8Array;
      const blob = new Blob([data.buffer as ArrayBuffer], { type: FORMATS.find(f => f.ext === opts.outputFormat)?.mime ?? "video/mp4" });
      setOutputUrl(URL.createObjectURL(blob));
      setOutputSize(blob.size);
      setConvertTime(Math.round((Date.now() - startRef.current) / 1000));
      setProgress(100);
      setStage("done");

      try { await ff.deleteFile(inName); await ff.deleteFile(outName); } catch { /* ok */ }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setStage("error");
    }
  };

  // ── Download ──
  const download = () => {
    if (!outputUrl || !file) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = file.name.replace(/\.[^.]+$/, "") + "." + opts.outputFormat;
    a.click();
  };

  const reset = () => {
    setStage("idle"); setFile(null); setVideoUrl(null);
    setOutputUrl(null); setError(""); setProgress(0);
    setOpts(DEFAULT_OPTS);
  };

  const selectedFormat = FORMATS.find(f => f.ext === opts.outputFormat)!;
  const isAudioOut  = selectedFormat.category === "audio";
  const isImageOut  = selectedFormat.category === "image";
  const isVideoOut  = selectedFormat.category === "video";
  const savings     = inputSize > 0 && outputSize > 0
    ? Math.round((1 - outputSize / inputSize) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#07080f] px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">

        {/* ── Header ── */}
        <div className="mb-8">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Tools
          </Link>
          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
              <RefreshCw className="h-7 w-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Video Format Converter</h1>
              <p className="mt-1 text-white/50 text-sm">
                Convert any video to MP4, WebM, MOV, AVI, MKV, GIF, MP3, M4A and more — fully in your browser.
              </p>
            </div>
          </div>
          {/* Feature pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: <ShieldCheck className="h-3 w-3" />, label: "100% Private" },
              { icon: <Globe       className="h-3 w-3" />, label: "No Upload" },
              { icon: <Zap         className="h-3 w-3" />, label: "Browser-Powered" },
              { icon: <FileVideo   className="h-3 w-3" />, label: "10+ Formats" },
            ].map(p => (
              <span key={p.label} className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-white/50">
                {p.icon}{p.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Drop zone (idle) ── */}
        {stage === "idle" && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative flex cursor-pointer flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed py-20 transition-all
              ${dragging ? "border-violet-400 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"}`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white">Drop your video here</p>
              <p className="mt-1 text-sm text-white/40">or click to browse — MP4, MOV, AVI, MKV, WebM, FLV, TS, 3GP…</p>
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          </div>
        )}

        {/* ── Main workspace (ready / converting / done / error) ── */}
        {stage !== "idle" && (
          <div className="space-y-4">

            {/* File info bar */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                <FileVideo className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{file?.name}</p>
                <p className="text-xs text-white/40">{fmtBytes(inputSize)} · {fmtTime(duration)}</p>
              </div>
              {stage === "ready" && (
                <button onClick={reset} className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white/70 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Hidden video for metadata */}
            {videoUrl && (
              <video ref={videoRef} src={videoUrl} onLoadedMetadata={onLoadedMeta}
                className="hidden" preload="metadata" />
            )}

            {/* ── Settings panel ── */}
            {(stage === "ready" || stage === "error") && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">

                {/* Output format grid */}
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Output Format</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {FORMATS.map(f => (
                      <button
                        key={f.ext}
                        onClick={() => setOpt("outputFormat", f.ext)}
                        className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all
                          ${opts.outputFormat === f.ext
                            ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                            : "border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/15 hover:text-white/80"}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`${opts.outputFormat === f.ext ? "text-violet-400" : "text-white/30"}`}>
                            {categoryIcon(f.category)}
                          </span>
                          <span className="text-sm font-bold">{f.label}</span>
                        </div>
                        <span className="text-[10px] leading-tight text-white/30">{f.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality row */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">Quality</p>
                    <div className="flex flex-col gap-1.5">
                      {(["lossless", "high", "medium", "compressed"] as const).map(q => (
                        <button key={q} onClick={() => setOpt("quality", q)}
                          className={`rounded-lg px-3 py-1.5 text-left text-xs transition-all capitalize
                            ${opts.quality === q ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white/70"}`}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution */}
                  {(isVideoOut || isImageOut) && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">Resolution</p>
                      <div className="flex flex-col gap-1.5">
                        {(["original", "1080p", "720p", "480p", "360p"] as const).map(r => (
                          <button key={r} onClick={() => setOpt("resolution", r)}
                            className={`rounded-lg px-3 py-1.5 text-left text-xs transition-all uppercase
                              ${opts.resolution === r ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white/70"}`}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FPS */}
                  {(isVideoOut || isImageOut) && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">Frame Rate</p>
                      <div className="flex flex-col gap-1.5">
                        {(["original", "60", "30", "24", "15"] as const).map(f => (
                          <button key={f} onClick={() => setOpt("fps", f)}
                            className={`rounded-lg px-3 py-1.5 text-left text-xs transition-all
                              ${opts.fps === f ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white/70"}`}>
                            {f === "original" ? "Original" : `${f} fps`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audio bitrate */}
                  {!isImageOut && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">Audio Bitrate</p>
                      <div className="flex flex-col gap-1.5">
                        {(["320k", "192k", "128k", "96k", "64k"] as const).map(b => (
                          <button key={b} onClick={() => setOpt("audioBitrate", b)}
                            className={`rounded-lg px-3 py-1.5 text-left text-xs transition-all
                              ${opts.audioBitrate === b ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white/70"}`}>
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggles row */}
                <div className="flex flex-wrap gap-2">
                  {isVideoOut && (
                    <Toggle active={opts.muteAudio} onToggle={v => setOpt("muteAudio", v)}
                      icon={opts.muteAudio ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      label="Mute Audio" />
                  )}
                  <Toggle active={opts.stripMetadata} onToggle={v => setOpt("stripMetadata", v)}
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    label="Strip Metadata" />
                  {duration > 0 && (
                    <Toggle active={opts.useTrim} onToggle={v => setOpt("useTrim", v)}
                      icon={<Play className="h-3.5 w-3.5" />}
                      label="Trim Clip" />
                  )}
                </div>

                {/* Trim controls */}
                {opts.useTrim && duration > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Trim Range</p>
                    <div className="flex gap-4">
                      <label className="flex-1">
                        <span className="block mb-1 text-xs text-white/40">Start</span>
                        <input type="range" min={0} max={duration} step={0.1}
                          value={opts.trimStart}
                          onChange={e => setOpt("trimStart", +e.target.value)}
                          className="w-full accent-violet-500" />
                        <span className="text-xs text-violet-300">{fmtTime(opts.trimStart)}</span>
                      </label>
                      <label className="flex-1">
                        <span className="block mb-1 text-xs text-white/40">End</span>
                        <input type="range" min={0} max={duration} step={0.1}
                          value={opts.trimEnd}
                          onChange={e => setOpt("trimEnd", +e.target.value)}
                          className="w-full accent-violet-500" />
                        <span className="text-xs text-violet-300">{fmtTime(opts.trimEnd)}</span>
                      </label>
                    </div>
                    <p className="text-xs text-white/30">
                      Duration: {fmtTime(Math.max(0, opts.trimEnd - opts.trimStart))}
                    </p>
                  </div>
                )}

                {/* Advanced toggle */}
                <button onClick={() => setShowAdvanced(a => !a)}
                  className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
                  <Settings2 className="h-3.5 w-3.5" />
                  Advanced options
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </button>

                {showAdvanced && isVideoOut && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Video Codec</p>
                    <div className="flex flex-wrap gap-2">
                      {(["auto", "libx264", "libx265", "libvpx-vp9"] as const).map(c => (
                        <button key={c} onClick={() => setOpt("videoCodec", c)}
                          className={`rounded-lg px-3 py-1.5 text-xs transition-all
                            ${opts.videoCodec === c ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "border border-white/[0.06] bg-white/[0.02] text-white/50 hover:text-white/70"}`}>
                          {c === "auto" ? "Auto" : c}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/25 flex items-start gap-1">
                      <Info className="h-3 w-3 shrink-0 mt-0.5" />
                      H.264 (libx264) is fastest and most compatible. H.265 compresses ~40% better. VP9 is required for WebM.
                    </p>
                  </div>
                )}

                {/* Error */}
                {stage === "error" && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {/* Convert button */}
                <button onClick={convert}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 text-sm font-bold text-white transition hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.98]">
                  Convert to {opts.outputFormat.toUpperCase()}
                </button>
              </div>
            )}

            {/* ── Progress ── */}
            {stage === "converting" && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center space-y-5">
                <div className="flex justify-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{progressMsg || "Converting…"}</p>
                  <p className="mt-1 text-xs text-white/40">{progress}% complete</p>
                </div>
                <div className="mx-auto max-w-xs">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                      style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <p className="text-xs text-white/25">Files never leave your device</p>
              </div>
            )}

            {/* ── Done ── */}
            {stage === "done" && outputUrl && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <p className="font-semibold text-emerald-300">Conversion complete!</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Input", value: fmtBytes(inputSize) },
                    { label: "Output", value: fmtBytes(outputSize) },
                    { label: savings >= 0 ? "Saved" : "Larger",
                      value: `${Math.abs(savings)}%`,
                      color: savings > 0 ? "text-emerald-400" : "text-amber-400" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
                      <p className={`text-lg font-bold ${s.color ?? "text-white"}`}>{s.value}</p>
                      <p className="text-xs text-white/40">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Preview for video/gif */}
                {(isVideoOut || isImageOut) && !isAudioOut && (
                  <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                    {isImageOut
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={outputUrl} alt="Converted GIF preview" className="w-full" />
                      : <video src={outputUrl} controls className="w-full max-h-72 bg-black" />
                    }
                  </div>
                )}

                {/* Audio preview */}
                {isAudioOut && (
                  <audio src={outputUrl} controls className="w-full" />
                )}

                <div className="flex gap-3">
                  <button onClick={download}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500">
                    <Download className="h-4 w-4" />
                    Download {opts.outputFormat.toUpperCase()}
                  </button>
                  <button onClick={() => setStage("ready")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/60 transition hover:bg-white/[0.07] hover:text-white">
                    <Settings2 className="h-4 w-4" />
                    Re-convert
                  </button>
                  <button onClick={reset}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/60 transition hover:bg-white/[0.07] hover:text-white">
                    <RefreshCw className="h-4 w-4" />
                    New file
                  </button>
                </div>

                <p className="text-center text-xs text-white/25">
                  Converted in {convertTime}s · your file never left your device
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Info cards ── */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: <ShieldCheck className="h-5 w-5 text-violet-400" />,
              title: "100% Private",
              body: "Your video is processed entirely inside your browser using WebAssembly. Nothing is sent to any server.",
            },
            {
              icon: <Zap className="h-5 w-5 text-amber-400" />,
              title: "All Formats",
              body: "Convert between MP4, WebM, MOV, AVI, MKV, GIF, MP3, M4A, WAV, OGG and more with full codec control.",
            },
            {
              icon: <Globe className="h-5 w-5 text-emerald-400" />,
              title: "No Install",
              body: "Runs entirely in your browser — no software to download, no account required, no file size limits.",
            },
          ].map(c => (
            <div key={c.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                {c.icon}
              </div>
              <p className="font-semibold text-white">{c.title}</p>
              <p className="mt-1 text-sm text-white/40">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Toggle button ─────────────────────────────────────────────────────────────

function Toggle({ active, onToggle, icon, label }: {
  active: boolean; onToggle: (v: boolean) => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button onClick={() => onToggle(!active)}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all
        ${active ? "border-violet-500/40 bg-violet-500/15 text-violet-300" : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/70"}`}>
      {icon}{label}
    </button>
  );
}

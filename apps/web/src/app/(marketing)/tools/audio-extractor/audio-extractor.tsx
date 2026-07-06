"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, Download, FileVideo, Zap, ShieldCheck, Globe,
  Loader2, AlertCircle, X, Settings2, ChevronDown, Music,
  Volume2, Mic, FileAudio, AudioLines, RefreshCw, Info,
  Scissors, VolumeX, Check, Copy,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "ready" | "processing" | "done" | "error";

interface AudioFormat {
  ext: string;
  label: string;
  mime: string;
  codec: string;
  description: string;
  lossy: boolean;
}

interface ExtractOpts {
  format: string;
  bitrate: string;
  sampleRate: string;
  channels: "stereo" | "mono";
  normalize: boolean;
  removeNoise: boolean;
  useTrim: boolean;
  trimStart: number;
  trimEnd: number;
  fadeIn: number;
  fadeOut: number;
}

// ─── Format catalogue ─────────────────────────────────────────────────────────

const FORMATS: AudioFormat[] = [
  { ext: "mp3",  label: "MP3",  mime: "audio/mpeg",     codec: "libmp3lame", description: "Universal — plays anywhere",      lossy: true  },
  { ext: "aac",  label: "AAC",  mime: "audio/aac",      codec: "aac",        description: "Apple / iTunes standard",          lossy: true  },
  { ext: "m4a",  label: "M4A",  mime: "audio/mp4",      codec: "aac",        description: "AAC in MP4 wrapper",               lossy: true  },
  { ext: "ogg",  label: "OGG",  mime: "audio/ogg",      codec: "libvorbis",  description: "Open source, great quality",       lossy: true  },
  { ext: "opus", label: "Opus", mime: "audio/ogg",      codec: "libopus",    description: "Best quality per bit",             lossy: true  },
  { ext: "wav",  label: "WAV",  mime: "audio/wav",      codec: "pcm_s16le",  description: "Lossless — large file size",       lossy: false },
  { ext: "flac", label: "FLAC", mime: "audio/flac",     codec: "flac",       description: "Lossless compression",             lossy: false },
  { ext: "aiff", label: "AIFF", mime: "audio/aiff",     codec: "pcm_s16be",  description: "Apple lossless (old standard)",    lossy: false },
];

const BITRATES = ["320k", "256k", "192k", "128k", "96k", "64k"];
const SAMPLE_RATES = ["48000", "44100", "22050", "16000", "8000"];

const DEFAULT_OPTS: ExtractOpts = {
  format: "mp3",
  bitrate: "192k",
  sampleRate: "44100",
  channels: "stereo",
  normalize: false,
  removeNoise: false,
  useTrim: false,
  trimStart: 0,
  trimEnd: 0,
  fadeIn: 0,
  fadeOut: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtSec(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function buildArgs(
  inName: string,
  outName: string,
  opts: ExtractOpts,
  duration: number,
  fmt: AudioFormat,
): string[] {
  const args: string[] = ["-y", "-i", inName];

  // Trim
  if (opts.useTrim && opts.trimStart > 0) args.push("-ss", String(opts.trimStart));
  if (opts.useTrim && opts.trimEnd > 0 && opts.trimEnd > opts.trimStart) {
    args.push("-to", String(opts.trimEnd));
  }

  // Audio filters chain
  const filters: string[] = [];
  if (opts.channels === "mono") filters.push("pan=mono|c0=0.5*c0+0.5*c1");
  if (opts.normalize) filters.push("loudnorm=I=-16:TP=-1.5:LRA=11");
  if (opts.fadeIn > 0) filters.push(`afade=t=in:ss=0:d=${opts.fadeIn}`);
  if (opts.fadeOut > 0) {
    const effectiveDur = opts.useTrim && opts.trimEnd > 0 ? opts.trimEnd - opts.trimStart : duration;
    filters.push(`afade=t=out:st=${effectiveDur - opts.fadeOut}:d=${opts.fadeOut}`);
  }
  if (filters.length > 0) args.push("-af", filters.join(","));

  // Sample rate
  args.push("-ar", opts.sampleRate);

  // Video: none
  args.push("-vn");

  // Codec + bitrate
  args.push("-c:a", fmt.codec);
  if (fmt.lossy && opts.bitrate) {
    if (fmt.ext === "opus") args.push("-b:a", opts.bitrate);
    else args.push("-b:a", opts.bitrate);
  }

  args.push(outName);
  return args;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AudioExtractor() {
  const [stage, setStage]             = useState<Stage>("idle");
  const [file, setFile]               = useState<File | null>(null);
  const [videoUrl, setVideoUrl]       = useState<string | null>(null);
  const [duration, setDuration]       = useState(0);
  const [opts, setOpts]               = useState<ExtractOpts>(DEFAULT_OPTS);
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]             = useState("");
  const [dragging, setDragging]       = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [outputUrl, setOutputUrl]     = useState<string | null>(null);
  const [outputSize, setOutputSize]   = useState(0);
  const [copied, setCopied]           = useState(false);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffLoaded  = useRef(false);
  const fileRef   = useRef<HTMLInputElement>(null);

  const ACCEPT = "video/*,audio/*,.mp4,.webm,.mov,.avi,.mkv,.flv,.wmv,.m4v,.3gp,.ts,.mts,.mp3,.m4a,.wav,.ogg,.flac,.aiff,.aac";

  const setOpt = <K extends keyof ExtractOpts>(k: K, v: ExtractOpts[K]) =>
    setOpts(o => ({ ...o, [k]: v }));

  const selectedFmt = FORMATS.find(f => f.ext === opts.format)!;
  const isLossless = !selectedFmt.lossy;

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
    ff.on("progress", ({ progress: p }) => setProgress(Math.round(10 + p * 85)));
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
    setOpts(o => ({ ...o, trimStart: 0, trimEnd: 0, useTrim: false }));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) pickFile(f);
  }, []);

  const onMeta = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    setDuration(v.duration);
    setOpts(o => ({ ...o, trimEnd: Math.floor(v.duration) }));
  };

  // ── Extract ──
  const extract = async () => {
    if (!file) return;
    setStage("processing"); setProgress(5);
    setOutputUrl(null); setError("");

    try {
      setProgressMsg("Loading FFmpeg…");
      const ff = await loadFFmpeg();
      setProgress(10);
      setProgressMsg("Reading file…");

      const ext    = file.name.split(".").pop() ?? "mp4";
      const inName = `input.${ext}`;
      const outName = `output.${opts.format}`;

      await ff.writeFile(inName, await fetchFile(file));
      setProgress(18);
      setProgressMsg(`Extracting audio as ${opts.format.toUpperCase()}…`);

      const ffArgs = buildArgs(inName, outName, opts, duration, selectedFmt);
      const ret = await ff.exec(ffArgs);
      if (ret !== 0) throw new Error("Extraction failed — make sure the file has an audio track.");

      const data = await ff.readFile(outName) as Uint8Array;
      try { await ff.deleteFile(inName); await ff.deleteFile(outName); } catch { /* ok */ }

      const blob = new Blob([data.buffer as ArrayBuffer], { type: selectedFmt.mime });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStage("done");
    } catch (e: any) {
      setError(e?.message ?? "Extraction failed.");
      setStage("error");
    }
  };

  const download = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `${file?.name.replace(/\.[^.]+$/, "") ?? "audio"}.${opts.format}`;
    a.click();
  };

  const reset = () => {
    setStage("idle"); setFile(null); setVideoUrl(null);
    setOutputUrl(null); setError(""); setProgress(0); setDuration(0);
  };

  const compressionPct = outputSize > 0 && file ? Math.round((1 - outputSize / file.size) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#07080f] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* ── Header ── */}
        <div className="mb-8">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Tools
          </Link>
          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20">
              <Music className="h-7 w-7 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold sm:text-3xl">Audio Extractor</h1>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Free</span>
              </div>
              <p className="mt-1 text-white/50 text-sm">Extract audio from any video or convert between audio formats. MP3, AAC, WAV, FLAC, OGG, Opus, M4A and more.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: <ShieldCheck className="h-3 w-3" />, label: "100% Private" },
              { icon: <Globe       className="h-3 w-3" />, label: "No Upload" },
              { icon: <Zap         className="h-3 w-3" />, label: "Browser-side" },
              { icon: <FileAudio   className="h-3 w-3" />, label: "8 Audio Formats" },
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
              ${dragging ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"}`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white">Drop your video or audio here</p>
              <p className="mt-1 text-sm text-white/40">MP4, MOV, AVI, MKV, WebM, FLV, MP3, WAV, FLAC, OGG…</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {["MP4", "MOV", "AVI", "MKV", "WebM", "FLV", "TS", "MP3", "WAV", "FLAC"].map(f => (
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

            {/* Left column */}
            <div className="space-y-4">

              {/* File info */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <FileVideo className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{file?.name}</p>
                  <p className="text-xs text-white/40">{fmtBytes(file?.size ?? 0)} · {duration > 0 ? fmtTime(duration) : "—"}</p>
                </div>
                <button onClick={reset} className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white/70 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Media preview */}
              {videoUrl && (
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
                  <video
                    src={videoUrl} controls
                    className="w-full max-h-56"
                    onLoadedMetadata={onMeta}
                    onError={() => {
                      // If video fails, try audio
                    }}
                  />
                </div>
              )}

              {/* Progress */}
              {stage === "processing" && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                    <p className="font-semibold text-white">{progressMsg}</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
                      style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-white/30">{progress}% complete</p>
                </div>
              )}

              {/* Error */}
              {stage === "error" && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-300">Extraction failed</p>
                    <p className="mt-1 text-sm text-red-300/70">{error}</p>
                  </div>
                </div>
              )}

              {/* Done — output player + stats */}
              {stage === "done" && outputUrl && (
                <div className="space-y-4">
                  {/* Audio player */}
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-cyan-300">Extracted Audio</span>
                      </div>
                      <span className="text-xs text-white/40">{fmtBytes(outputSize)} · {opts.format.toUpperCase()}</span>
                    </div>
                    <audio src={outputUrl} controls className="w-full" />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
                      <p className="text-lg font-bold text-white">{fmtBytes(outputSize)}</p>
                      <p className="text-xs text-white/40">Output size</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
                      <p className={`text-lg font-bold ${compressionPct > 0 ? "text-emerald-400" : "text-white"}`}>
                        {compressionPct > 0 ? `-${compressionPct}%` : `+${Math.abs(compressionPct)}%`}
                      </p>
                      <p className="text-xs text-white/40">Size change</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
                      <p className="text-lg font-bold text-white">{opts.format.toUpperCase()}</p>
                      <p className="text-xs text-white/40">Format</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button onClick={download}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 py-4 text-sm font-bold text-white transition hover:from-cyan-500 hover:to-teal-500 active:scale-[0.98]">
                      <Download className="h-4 w-4" /> Download {opts.format.toUpperCase()}
                    </button>
                    <button onClick={() => setStage("ready")}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm text-white/50 hover:text-white transition-colors flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right column — settings */}
            <div className="space-y-4">

              {/* Output format */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Output Format</p>
                <div className="grid grid-cols-4 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.ext} onClick={() => setOpt("format", f.ext)}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all
                        ${opts.format === f.ext
                          ? "border-cyan-500/50 bg-cyan-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"}`}>
                      <span className={`text-xs font-bold ${opts.format === f.ext ? "text-cyan-300" : "text-white/60"}`}>
                        {f.label}
                      </span>
                      <span className={`text-[9px] ${f.lossy ? "text-amber-400/60" : "text-emerald-400/60"}`}>
                        {f.lossy ? "lossy" : "lossless"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-white/30">{selectedFmt.description}</p>
              </div>

              {/* Quality / Bitrate */}
              {!isLossless && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Bitrate</p>
                  <div className="grid grid-cols-3 gap-2">
                    {BITRATES.map(b => (
                      <button key={b} onClick={() => setOpt("bitrate", b)}
                        className={`rounded-xl border py-2 text-xs font-semibold transition-all
                          ${opts.bitrate === b
                            ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                            : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-white/20">
                    <span>Best quality</span>
                    <span>Smallest size</span>
                  </div>
                </div>
              )}

              {/* Channels */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Channels</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["stereo", "mono"] as const).map(c => (
                    <button key={c} onClick={() => setOpt("channels", c)}
                      className={`rounded-xl border py-2.5 text-sm font-semibold capitalize transition-all
                        ${opts.channels === c
                          ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                          : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                      {c === "stereo" ? "🎧 Stereo" : "🎤 Mono"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trim */}
              {duration > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Trim Audio</p>
                    <button onClick={() => setOpt("useTrim", !opts.useTrim)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${opts.useTrim ? "bg-cyan-500" : "bg-white/10"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${opts.useTrim ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {opts.useTrim && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-white/40">Start</p>
                          <span className="font-mono text-xs text-cyan-400">{fmtSec(opts.trimStart)}</span>
                        </div>
                        <input type="range" min={0} max={Math.floor(duration)} step={1} value={opts.trimStart}
                          onChange={e => setOpt("trimStart", +e.target.value)}
                          className="w-full accent-cyan-500" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-white/40">End</p>
                          <span className="font-mono text-xs text-cyan-400">{fmtSec(opts.trimEnd)}</span>
                        </div>
                        <input type="range" min={0} max={Math.floor(duration)} step={1} value={opts.trimEnd}
                          onChange={e => setOpt("trimEnd", +e.target.value)}
                          className="w-full accent-cyan-500" />
                      </div>
                      <p className="text-xs text-white/30">Duration: {fmtTime(opts.trimEnd - opts.trimStart)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced toggle */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <button onClick={() => setShowAdvanced(a => !a)}
                  className="flex w-full items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
                  <Settings2 className="h-3.5 w-3.5" />
                  Advanced options
                  <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </button>

                {showAdvanced && (
                  <div className="space-y-4 border-t border-white/[0.06] pt-4">
                    {/* Sample rate */}
                    <div>
                      <p className="mb-2 text-xs text-white/40">Sample Rate</p>
                      <div className="relative">
                        <select value={opts.sampleRate} onChange={e => setOpt("sampleRate", e.target.value)}
                          className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-white focus:outline-none">
                          <option value="48000" className="bg-[#0d0d1a]">48,000 Hz (HD audio)</option>
                          <option value="44100" className="bg-[#0d0d1a]">44,100 Hz (CD quality)</option>
                          <option value="22050" className="bg-[#0d0d1a]">22,050 Hz</option>
                          <option value="16000" className="bg-[#0d0d1a]">16,000 Hz (speech)</option>
                          <option value="8000"  className="bg-[#0d0d1a]">8,000 Hz (phone)</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-3 w-3 text-white/30" />
                      </div>
                    </div>

                    {/* Normalize */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/60">Normalize volume</p>
                        <p className="text-[10px] text-white/30">Loudness normalize to -16 LUFS</p>
                      </div>
                      <button onClick={() => setOpt("normalize", !opts.normalize)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${opts.normalize ? "bg-cyan-500" : "bg-white/10"}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${opts.normalize ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    {/* Fade in */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-white/40">Fade In (seconds)</p>
                        <span className="font-mono text-xs text-cyan-400">{opts.fadeIn}s</span>
                      </div>
                      <input type="range" min={0} max={5} step={0.5} value={opts.fadeIn}
                        onChange={e => setOpt("fadeIn", +e.target.value)}
                        className="w-full accent-cyan-500" />
                    </div>

                    {/* Fade out */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-white/40">Fade Out (seconds)</p>
                        <span className="font-mono text-xs text-cyan-400">{opts.fadeOut}s</span>
                      </div>
                      <input type="range" min={0} max={5} step={0.5} value={opts.fadeOut}
                        onChange={e => setOpt("fadeOut", +e.target.value)}
                        className="w-full accent-cyan-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Extract button */}
              {(stage === "ready" || stage === "error") && (
                <button onClick={extract}
                  className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 py-4 text-sm font-bold text-white transition hover:from-cyan-500 hover:to-teal-500 active:scale-[0.98] flex items-center justify-center gap-2">
                  <Music className="h-4 w-4" />
                  Extract as {opts.format.toUpperCase()}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Format info cards ── */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { fmt: "MP3",  desc: "Best for music, podcasts, universal playback", tag: "lossy",    color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"  },
            { fmt: "WAV",  desc: "Lossless — perfect for editing & production",   tag: "lossless", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20"},
            { fmt: "AAC",  desc: "Better than MP3 at same bitrate, iOS default",  tag: "lossy",    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"   },
            { fmt: "FLAC", desc: "Lossless compression — smaller than WAV",       tag: "lossless", color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
          ].map(p => (
            <div key={p.fmt} className={`rounded-2xl border ${p.border} ${p.bg} p-4`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm font-bold ${p.color}`}>{p.fmt}</p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${p.tag === "lossless" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{p.tag}</span>
              </div>
              <p className="text-xs text-white/40 leading-snug">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Feature cards ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: <Volume2   className="h-5 w-5 text-cyan-400"    />, title: "Volume Normalize",  body: "Loudness-normalize your audio to broadcast standard -16 LUFS in one click." },
            { icon: <Scissors  className="h-5 w-5 text-teal-400"    />, title: "Trim & Fade",       body: "Set in/out points before extraction. Add fade-in / fade-out smoothly." },
            { icon: <AudioLines  className="h-5 w-5 text-emerald-400" />, title: "Lossless Support",  body: "Extract as WAV or FLAC for perfect quality — ideal for music production and editing." },
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

        {/* Notice */}
        <div className="mt-6 rounded-2xl border border-blue-500/15 bg-blue-500/5 px-5 py-4 flex items-start gap-3">
          <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
          <p className="text-xs text-blue-300/70 leading-relaxed">
            <span className="font-semibold text-blue-300">100% in-browser processing.</span>{" "}
            Your files never leave your device. This tool works with virtually any video or audio format — MP4, MOV, AVI, MKV, WebM, FLV, TS, 3GP, MP3, WAV, FLAC, OGG, AIFF and more.
          </p>
        </div>
      </div>
    </div>
  );
}

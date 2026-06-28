"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Scissors, Upload, Download, ArrowLeft, Play, Pause, RotateCcw,
  Loader2, CheckCircle, AlertCircle, FileVideo, Zap, Globe,
  ShieldCheck, Sliders, Plus, Trash2, VolumeX, Music, Crop,
  RotateCw, Share2, Smartphone, Monitor, FlipHorizontal, FlipVertical,
  ChevronDown, Settings2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "ready" | "processing" | "done" | "error";
type OutputFormat = "mp4" | "webm" | "gif" | "m4a";
type Quality = "high" | "medium" | "compressed";
type Resolution = "original" | "1080p" | "720p" | "480p";
type SpeedValue = 0.25 | 0.5 | 0.75 | 1 | 1.5 | 2;
type CropAspect = "original" | "16:9" | "9:16" | "1:1";
type RotateFlip = "none" | "90cw" | "90ccw" | "180" | "hflip" | "vflip";

interface Segment { id: string; start: number; end: number }
interface Thumb { t: number; url: string }

interface ExportOpts {
  format: OutputFormat; quality: Quality; resolution: Resolution;
  speed: SpeedValue; fadeIn: boolean; fadeOut: boolean; fadeDuration: number;
  muteAudio: boolean; audioOnly: boolean; crop: CropAspect; rotate: RotateFlip;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(secs: number) {
  if (isNaN(secs) || secs < 0) return "00:00.0";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.round((secs % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
}

function parseFmt(str: string): number {
  const [ms, rest] = str.split(".").reverse();
  const [s = "0", m = "0"] = (rest ?? str).split(":").reverse();
  return parseInt(m) * 60 + parseInt(s) + (ms ? parseInt(ms) / 10 : 0);
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function buildAtempoChain(speed: number): string {
  const parts: string[] = [];
  let s = speed;
  while (s < 0.5) { parts.push("atempo=0.5"); s /= 0.5; }
  while (s > 2.0) { parts.push("atempo=2.0"); s /= 2.0; }
  parts.push(`atempo=${s.toFixed(4)}`);
  return parts.join(",");
}

// Compute crop dimensions in JS (avoids commas inside FFmpeg filter expressions,
// which the filter_complex parser misreads as filter-chain separators).
function computeCropDims(iw: number, ih: number, crop: CropAspect): { w: number; h: number } | null {
  if (crop === "original" || iw === 0 || ih === 0) return null;
  const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  if (crop === "16:9") {
    return iw * 9 > ih * 16
      ? { w: even(ih * 16 / 9), h: ih }      // wider than 16:9 → crop width
      : { w: iw, h: even(iw * 9 / 16) };     // taller than 16:9 → crop height
  }
  if (crop === "9:16") {
    return iw * 16 < ih * 9
      ? { w: iw, h: even(iw * 16 / 9) }      // more portrait than 9:16 → crop height
      : { w: even(ih * 9 / 16), h: ih };      // wider → crop width
  }
  if (crop === "1:1") {
    const s = Math.min(iw, ih); return { w: s, h: s };
  }
  return null;
}

function getCropFilter(iw: number, ih: number, crop: CropAspect): string | null {
  const d = computeCropDims(iw, ih, crop);
  return d ? `crop=${d.w}:${d.h}` : null;
}

function getRotateFilter(rotate: RotateFlip): string | null {
  if (rotate === "90cw")  return "transpose=1";
  if (rotate === "90ccw") return "transpose=2";
  if (rotate === "180")   return "transpose=1,transpose=1";
  if (rotate === "hflip") return "hflip";
  if (rotate === "vflip") return "vflip";
  return null;
}

function getScaleFilter(resolution: Resolution, crop: CropAspect): string | null {
  if (resolution === "original") return null;
  const short: Record<Resolution, number> = { original: 0, "1080p": 1080, "720p": 720, "480p": 480 };
  const long:  Record<Resolution, number> = { original: 0, "1080p": 1920, "720p": 1280, "480p": 854 };
  const ss = short[resolution]; const ls = long[resolution];
  if (crop === "16:9") return `scale=${ls}:${ss}`;
  if (crop === "9:16") return `scale=${ss}:${ls}`;
  if (crop === "1:1")  return `scale=${ss}:${ss}`;
  return `scale=-2:${ss}`;
}

function buildFFmpegArgs(inName: string, segments: Segment[], opts: ExportOpts, videoHasAudio = true, videoW = 0, videoH = 0): { args: string[]; outName: string } {
  const { format, quality, resolution, speed, fadeIn, fadeOut, fadeDuration, muteAudio, audioOnly, crop, rotate } = opts;
  const f3 = (n: number) => n.toFixed(3);
  const outName = `output.${format}`;
  const isGif = format === "gif"; const hasVideo = !audioOnly; const hasAudio = !muteAudio && !isGif && videoHasAudio;
  const needsFilters = speed !== 1 || fadeIn || fadeOut || resolution !== "original" || isGif || audioOnly || muteAudio || format !== "mp4" || crop !== "original" || rotate !== "none";
  if (!needsFilters && segments.length === 1)
    return { outName, args: ["-y", "-i", inName, "-ss", f3(segments[0].start), "-to", f3(segments[0].end), "-c", "copy", "-avoid_negative_ts", "make_zero", outName] };

  const totalDuration = segments.reduce((sum, s) => sum + (s.end - s.start) / speed, 0);
  const parts: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const { start, end } = segments[i];
    if (hasVideo) {
      let vf = `[0:v]trim=start=${f3(start)}:end=${f3(end)},setpts=PTS-STARTPTS`;
      if (speed !== 1) vf += `,setpts=${(1 / speed).toFixed(4)}*PTS`;
      parts.push(`${vf}[vs${i}]`);
    }
    if (hasAudio) {
      let af = `[0:a]atrim=start=${f3(start)}:end=${f3(end)},asetpts=PTS-STARTPTS`;
      if (speed !== 1) af += `,${buildAtempoChain(speed)}`;
      parts.push(`${af}[as${i}]`);
    }
  }
  let vLabel = "[vs0]"; let aLabel = "[as0]";
  if (segments.length > 1) {
    if (hasVideo && hasAudio) {
      parts.push(`${segments.map((_, i) => `[vs${i}][as${i}]`).join("")}concat=n=${segments.length}:v=1:a=1[vc][ac]`);
      vLabel = "[vc]"; aLabel = "[ac]";
    } else if (hasVideo) {
      parts.push(`${segments.map((_, i) => `[vs${i}]`).join("")}concat=n=${segments.length}:v=1:a=0[vc]`);
      vLabel = "[vc]";
    } else {
      parts.push(`${segments.map((_, i) => `[as${i}]`).join("")}concat=n=${segments.length}:v=0:a=1[ac]`);
      aLabel = "[ac]";
    }
  }
  if (hasVideo) {
    const postV: string[] = [];
    const rotF = getRotateFilter(rotate); if (rotF) postV.push(rotF);
    const cropF = getCropFilter(videoW, videoH, crop); if (cropF) postV.push(cropF);
    if (isGif) { postV.push("fps=10,scale=480:-1:flags=lanczos"); }
    else { const sf = getScaleFilter(resolution, crop); if (sf) postV.push(sf); }
    if (fadeIn)  postV.push(`fade=t=in:st=0:d=${fadeDuration}`);
    if (fadeOut) postV.push(`fade=t=out:st=${f3(totalDuration - fadeDuration)}:d=${fadeDuration}`);
    if (postV.length > 0) { parts.push(`${vLabel}${postV.join(",")}[vout]`); vLabel = "[vout]"; }
  }
  if (hasAudio) {
    const postA: string[] = [];
    if (fadeIn)  postA.push(`afade=t=in:st=0:d=${fadeDuration}`);
    if (fadeOut) postA.push(`afade=t=out:st=${f3(totalDuration - fadeDuration)}:d=${fadeDuration}`);
    if (postA.length > 0) { parts.push(`${aLabel}${postA.join(",")}[aout]`); aLabel = "[aout]"; }
  }
  const args: string[] = ["-y", "-i", inName, "-filter_complex", parts.join(";")];
  if (hasVideo) args.push("-map", vLabel);
  if (hasAudio) args.push("-map", aLabel);
  const crfMap: Record<Quality, string> = { high: "18", medium: "23", compressed: "28" };
  const webmCrfMap: Record<Quality, string> = { high: "15", medium: "33", compressed: "45" };
  if (isGif) {/* no extra codec */}
  else if (audioOnly) { args.push("-c:a", "aac", "-b:a", "192k"); }
  else if (format === "mp4") { args.push("-c:v", "libx264", "-crf", crfMap[quality], "-preset", "fast", "-pix_fmt", "yuv420p"); if (hasAudio) args.push("-c:a", "aac", "-b:a", "128k"); }
  else if (format === "webm") { args.push("-c:v", "libvpx-vp9", "-crf", webmCrfMap[quality], "-b:v", "0"); if (hasAudio) args.push("-c:a", "libopus", "-b:a", "128k"); }
  if (!hasAudio) args.push("-an");
  args.push(outName);
  return { args, outName };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED = "video/*,.mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.m4v,.ts,.3gp,.ogv,.rm,.rmvb";
const SEG_COLORS = [
  { bar: "bg-emerald-500", region: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400", ring: "ring-emerald-500/40" },
  { bar: "bg-blue-500",    region: "bg-blue-500/20",    border: "border-blue-500/50",    text: "text-blue-400",    ring: "ring-blue-500/40" },
  { bar: "bg-violet-500",  region: "bg-violet-500/20",  border: "border-violet-500/50",  text: "text-violet-400",  ring: "ring-violet-500/40" },
  { bar: "bg-amber-500",   region: "bg-amber-500/20",   border: "border-amber-500/50",   text: "text-amber-400",   ring: "ring-amber-500/40" },
  { bar: "bg-rose-500",    region: "bg-rose-500/20",    border: "border-rose-500/50",    text: "text-rose-400",    ring: "ring-rose-500/40" },
];
const SPEEDS: SpeedValue[] = [0.25, 0.5, 0.75, 1, 1.5, 2];
const SOCIAL_PRESETS = [
  { id: "yt-short", label: "YT Short",   sub: "9:16 · 1080p", icon: Smartphone, opts: { format: "mp4" as OutputFormat, quality: "high" as Quality, resolution: "1080p" as Resolution, crop: "9:16" as CropAspect } },
  { id: "ig-reel",  label: "IG Reel",    sub: "9:16 · 1080p", icon: Share2,     opts: { format: "mp4" as OutputFormat, quality: "high" as Quality, resolution: "1080p" as Resolution, crop: "9:16" as CropAspect } },
  { id: "twitter",  label: "Twitter/X",  sub: "16:9 · 720p",  icon: Monitor,    opts: { format: "mp4" as OutputFormat, quality: "medium" as Quality, resolution: "720p" as Resolution, crop: "16:9" as CropAspect } },
  { id: "whatsapp", label: "WhatsApp",   sub: "480p · small", icon: Zap,        opts: { format: "mp4" as OutputFormat, quality: "compressed" as Quality, resolution: "480p" as Resolution, crop: "original" as CropAspect } },
];
const FEATURES = [
  { icon: Zap,         title: "Fast Trimming",     desc: "Select start/end on the timeline or type exact timestamps." },
  { icon: FileVideo,   title: "All Formats",        desc: "MP4, MOV, AVI, MKV, WebM and more — all supported." },
  { icon: Globe,       title: "100% In-Browser",    desc: "No upload to any server. Your video never leaves your device." },
  { icon: ShieldCheck, title: "Private & Secure",   desc: "Runs locally via WebAssembly. Zero data sent externally." },
  { icon: Sliders,     title: "Precise Control",    desc: "Multi-segment, crop, rotate, speed, fade & social presets." },
  { icon: Download,    title: "Free Download",      desc: "Download in MP4, WebM, GIF, or audio-only — instantly." },
];

// ─── Small reusable pieces ─────────────────────────────────────────────────────

function OptionPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${active
        ? "bg-emerald-500 text-white shadow-md shadow-emerald-900/40"
        : "border border-white/[0.08] bg-white/[0.04] text-white/50 hover:border-emerald-500/30 hover:text-emerald-400"}`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25">{children}</p>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoSlicer() {
  const fileRef      = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const timelineRef  = useRef<HTMLDivElement>(null);

  const [file, setFile]                 = useState<File | null>(null);
  const [videoUrl, setVideoUrl]         = useState("");
  const [duration, setDuration]         = useState(0);
  const [currentTime, setCurrentTime]   = useState(0);
  const [playing, setPlaying]           = useState(false);

  const [segments, setSegments]         = useState<Segment[]>([{ id: uid(), start: 0, end: 0 }]);
  const [activeId, setActiveId]         = useState("");
  const [dragging, setDragging]         = useState<{ id: string; handle: "start" | "end" } | null>(null);

  const [stage, setStage]               = useState<Stage>("idle");
  const [progress, setProgress]         = useState(0);
  const [progressMsg, setProgressMsg]   = useState("");
  const [outputUrl, setOutputUrl]       = useState("");
  const [outputName, setOutputName]     = useState("");
  const [error, setError]               = useState("");

  const [thumbs, setThumbs]             = useState<Thumb[]>([]);
  const [hoverTime, setHoverTime]       = useState<number | null>(null);
  const [hoverX, setHoverX]             = useState(0);
  const [showOpts, setShowOpts]         = useState(false);
  const [videoHasAudio, setVideoHasAudio] = useState(true);
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });

  const [opts, setOpts] = useState<ExportOpts>({
    format: "mp4", quality: "medium", resolution: "original", speed: 1,
    fadeIn: false, fadeOut: false, fadeDuration: 1,
    muteAudio: false, audioOnly: false, crop: "original", rotate: "none",
  });
  const setOpt = <K extends keyof ExportOpts>(k: K, v: ExportOpts[K]) => setOpts(o => ({ ...o, [k]: v }));
  const applyPreset = (p: typeof SOCIAL_PRESETS[0]) => setOpts(o => ({ ...o, ...p.opts }));

  const activeSeg = segments.find(s => s.id === activeId) ?? segments[0];
  const col = (i: number) => SEG_COLORS[i % SEG_COLORS.length];
  const activeIdx = segments.findIndex(s => s.id === activeId);

  // ── Load ──
  const loadFile = useCallback((f: File) => {
    setFile(f); setStage("ready"); setOutputUrl(""); setError(""); setThumbs([]);
    setVideoHasAudio(true); // reset; onLoadedMetadata will refine this
    setVideoUrl(URL.createObjectURL(f));
  }, []);
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) loadFile(f); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("video/")) loadFile(f); };
  const onLoadedMetadata = () => {
    const v = videoRef.current; if (!v) return;
    const d = v.duration ?? 0; setDuration(d);
    const id = uid(); setSegments([{ id, start: 0, end: d }]); setActiveId(id);
    setVideoDims({ w: v.videoWidth, h: v.videoHeight });
    // Detect whether the video file has an audio track
    const tracks = (v as any).audioTracks;
    setVideoHasAudio(!tracks || tracks.length > 0);
  };

  // ── Thumbnails ──
  useEffect(() => {
    if (!videoUrl || !duration) return;
    let cancelled = false;
    const v = document.createElement("video"); v.src = videoUrl; v.muted = true; v.preload = "auto"; v.crossOrigin = "anonymous";
    const run = async () => {
      await new Promise<void>(res => v.addEventListener("loadedmetadata", () => res(), { once: true }));
      const count = Math.max(8, Math.min(24, Math.floor(duration / 3)));
      const canvas = document.createElement("canvas"); canvas.width = 120; canvas.height = 68;
      const ctx = canvas.getContext("2d")!;
      const result: Thumb[] = [];
      for (let i = 0; i < count; i++) {
        if (cancelled) break;
        const t = i === 0 ? 0.01 : (i / (count - 1)) * duration;
        v.currentTime = t;
        await new Promise<void>(res => v.addEventListener("seeked", () => res(), { once: true }));
        ctx.drawImage(v, 0, 0, 120, 68); result.push({ t, url: canvas.toDataURL("image/jpeg", 0.5) });
        if (result.length % 4 === 0) setThumbs([...result]);
      }
      if (!cancelled) setThumbs(result); v.src = "";
    };
    run().catch(() => {});
    return () => { cancelled = true; v.src = ""; };
  }, [videoUrl, duration]);

  // ── Playback ──
  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (playing) { v.pause(); } else { if (v.currentTime >= activeSeg.end) v.currentTime = activeSeg.start; v.play(); }
    setPlaying(!playing);
  };
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => { setCurrentTime(v.currentTime); if (v.currentTime >= activeSeg.end) { v.pause(); setPlaying(false); } };
    v.addEventListener("timeupdate", onTime); return () => v.removeEventListener("timeupdate", onTime);
  }, [activeSeg.end]);

  // ── Segments ──
  const addSegment = () => {
    if (segments.length >= 5) return;
    const last = segments[segments.length - 1]; const ns = Math.min(last.end + 0.5, duration - 1);
    const ne = Math.min(ns + Math.min(10, duration - ns), duration); if (ne <= ns) return;
    const id = uid(); setSegments(s => [...s, { id, start: ns, end: ne }]); setActiveId(id);
  };
  const removeSegment = (id: string) => {
    if (segments.length <= 1) return; const rem = segments.filter(s => s.id !== id);
    setSegments(rem); if (activeId === id) setActiveId(rem[0].id);
  };
  const updateSeg = (id: string, patch: Partial<Segment>) =>
    setSegments(ss => ss.map(s => s.id === id ? { ...s, ...patch } : s));

  // ── Timeline ──
  const getTimeFromX = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect(); if (!rect || duration === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
  };
  const onHandleMouseDown = (e: React.MouseEvent, id: string, handle: "start" | "end") => {
    e.preventDefault(); e.stopPropagation(); setActiveId(id); setDragging({ id, handle });
  };
  useEffect(() => {
    if (!dragging) return;
    const seg = segments.find(s => s.id === dragging.id); if (!seg) return;
    const onMove = (e: MouseEvent) => {
      const t = getTimeFromX(e.clientX);
      if (dragging.handle === "start") updateSeg(dragging.id, { start: Math.min(t, seg.end - 0.1) });
      else updateSeg(dragging.id, { end: Math.max(t, seg.start + 0.1) });
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, segments]);
  const onTimelineClick = (e: React.MouseEvent) => {
    if (dragging) return; const t = getTimeFromX(e.clientX);
    if (videoRef.current) videoRef.current.currentTime = t; setCurrentTime(t);
  };
  const onTimelineMouseMove = (e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect(); if (!rect) return;
    setHoverX(e.clientX - rect.left); setHoverTime(getTimeFromX(e.clientX));
  };
  const hoverThumb = hoverTime !== null && thumbs.length > 0
    ? thumbs.reduce((b, th) => Math.abs(th.t - hoverTime!) < Math.abs(b.t - hoverTime!) ? th : b)
    : null;

  // ── Process ──
  const processVideo = async () => {
    if (!file) return;
    setStage("processing"); setProgress(0); setProgressMsg("Loading video processor…"); setError("");
    try {
      const OriginalWorker = window.Worker;
      (window as any).Worker = class extends OriginalWorker {
        constructor(url: string | URL, wo?: WorkerOptions) {
          const s = url.toString();
          if (s.includes("ffmpeg") || s.includes("worker")) super(`${window.location.origin}/ffmpeg/ffmpeg-worker.js`);
          else super(url, wo);
        }
      };
      const { FFmpeg } = await import("@ffmpeg/ffmpeg"); const ffmpeg = new FFmpeg();
      (window as any).Worker = OriginalWorker;
      const { fetchFile } = await import("@ffmpeg/util");
      ffmpeg.on("progress", ({ progress: p }) => { setProgress(Math.round(p * 100)); setProgressMsg(`Processing… ${Math.round(p * 100)}%`); });
      const ffmpegLogs: string[] = [];
      ffmpeg.on("log", ({ message }) => {
        ffmpegLogs.push(message);
        if (message.includes("time=")) setProgressMsg(`Encoding… ${message.split("time=")[1]?.split(" ")[0] ?? ""}`);
      });
      setProgressMsg("Loading FFmpeg engine…");
      const origin = window.location.origin;
      await ffmpeg.load({ coreURL: `${origin}/ffmpeg/ffmpeg-core-umd.js`, wasmURL: `${origin}/ffmpeg/ffmpeg-core-umd.wasm` });
      setProgressMsg("Reading file…");
      const ext = file.name.split(".").pop() ?? "mp4"; const inName = `input.${ext}`;
      await ffmpeg.writeFile(inName, await fetchFile(file));
      setProgressMsg("Processing video…");
      const sorted = [...segments].sort((a, b) => a.start - b.start);
      let { args, outName } = buildFFmpegArgs(inName, sorted, opts, videoHasAudio, videoDims.w, videoDims.h);

      // Remove stale output file (even with -y some wasm builds still choke on existing files)
      try { await ffmpeg.deleteFile(outName); } catch { /* file may not exist yet */ }

      let ret = await ffmpeg.exec(args);

      // Retry 1: fast-path used -c copy but it failed (incompatible container/codec) → force re-encode
      const usedCopyFastPath = args.includes("-c") && args[args.indexOf("-c") + 1] === "copy";
      if (ret !== 0 && usedCopyFastPath) {
        setProgressMsg("Retrying with re-encode…");
        ffmpegLogs.length = 0;
        const reArgs = ["-y", "-i", inName,
          "-ss", (sorted[0].start).toFixed(3), "-to", (sorted[0].end).toFixed(3),
          "-c:v", "libx264", "-crf", "23", "-preset", "fast", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "128k", outName];
        try { await ffmpeg.deleteFile(outName); } catch { /* ok */ }
        ret = await ffmpeg.exec(reArgs);
      }

      // Retry 2: if audio caused the failure, strip it
      if (ret !== 0 && videoHasAudio && !opts.muteAudio && !opts.audioOnly && opts.format !== "gif") {
        setProgressMsg("Retrying without audio track…");
        ffmpegLogs.length = 0;
        const retry = buildFFmpegArgs(inName, sorted, { ...opts, muteAudio: true }, false, videoDims.w, videoDims.h);
        args = retry.args; outName = retry.outName;
        try { await ffmpeg.deleteFile(outName); } catch { /* ok */ }
        ret = await ffmpeg.exec(args);
      }

      if (ret !== 0) {
        const errLines = ffmpegLogs.filter(l => /error|invalid|unable|no such/i.test(l)).slice(-3);
        console.error("[VideoSlicer] FFmpeg failed. Log tail:\n", ffmpegLogs.slice(-10).join("\n"));
        throw new Error(
          errLines.length
            ? `Processing failed: ${errLines.join(" | ")}`
            : "Processing failed. Try a different format or quality setting."
        );
      }

      setProgressMsg("Preparing download…");
      const data = await ffmpeg.readFile(outName);
      const uint8 = data instanceof Uint8Array ? new Uint8Array(data.buffer as ArrayBuffer) : new TextEncoder().encode(data as string);
      const mimeMap: Record<OutputFormat, string> = { mp4: "video/mp4", webm: "video/webm", gif: "image/gif", m4a: "audio/mp4" };
      const blob = new Blob([uint8], { type: mimeMap[opts.format] });
      setOutputUrl(URL.createObjectURL(blob));
      setOutputName(`${file.name.replace(/\.[^.]+$/, "")}_edited.${opts.format}`);
      setStage("done"); setProgress(100); setProgressMsg("Done!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof window !== "undefined" && (window as any).newrelic)
        (window as any).newrelic.noticeError(err instanceof Error ? err : new Error(msg), { component: "VideoSlicer" });
      setError(msg || "Processing failed. Try a different browser.");
      setStage("error");
    }
  };

  const reset = () => {
    setFile(null); setVideoUrl(""); setStage("idle"); setOutputUrl(""); setError("");
    setProgress(0); setProgressMsg(""); setThumbs([]); setHoverTime(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const curPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const totalSelected = segments.reduce((sum, s) => sum + (s.end - s.start), 0);

  // Time ruler ticks
  const rulerTicks = (() => {
    if (!duration) return [];
    const step = duration <= 60 ? 5 : duration <= 300 ? 30 : duration <= 1800 ? 60 : 300;
    const ticks = [];
    for (let t = 0; t <= duration; t += step) ticks.push(t);
    return ticks;
  })();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-12 pt-20 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-4 py-1.5">
            <Scissors className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Free · No signup · Browser-based</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Video Slicer{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Online</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/45">
            Trim, crop, rotate, apply social presets and export — all in your browser, no upload required.
          </p>
        </div>
      </section>

      {/* ── Tool ── */}
      <section className="mx-auto max-w-4xl px-4 pb-24 space-y-3">

        {/* Upload drop zone */}
        {stage === "idle" && (
          <div
            className="group relative flex cursor-pointer flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed border-white/[0.08] bg-white/[0.015] px-8 py-20 text-center transition-all hover:border-emerald-500/35 hover:bg-emerald-500/[0.025]"
            onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
          >
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 ring-1 ring-emerald-500/20 transition-all group-hover:ring-emerald-500/40">
              <Upload className="h-8 w-8 text-emerald-400" />
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-black">
                <Plus className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-white">Drop your video here</p>
              <p className="mt-2 text-sm text-white/35">or click to browse · MP4, MOV, AVI, MKV, WebM, WMV, FLV &amp; more</p>
            </div>
            <button type="button" className="rounded-2xl bg-emerald-500 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-900/30 transition-all hover:bg-emerald-400 hover:shadow-emerald-900/50">
              Choose File
            </button>
            <p className="text-xs text-white/20">🔒 Your video never leaves your device</p>
            <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={onFileChange} />
          </div>
        )}

        {/* ── Editor ── */}
        {(stage === "ready" || stage === "done" || stage === "processing") && file && (
          <>
            {/* ── Video preview with overlay ── */}
            <div className="group relative overflow-hidden rounded-2xl bg-black ring-1 ring-white/[0.07]">
              <video
                ref={videoRef} src={videoUrl}
                className="max-h-[420px] w-full object-contain"
                onLoadedMetadata={onLoadedMetadata}
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
              />

              {/* Bottom gradient overlay */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />

              {/* Centered play button */}
              <button
                onClick={togglePlay}
                disabled={stage === "processing"}
                className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 disabled:pointer-events-none"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-black/60 ring-2 ring-white/20 backdrop-blur-sm transition-transform hover:scale-105 ${playing ? "" : ""}`}>
                  {playing
                    ? <Pause className="h-7 w-7 text-white" />
                    : <Play  className="h-7 w-7 text-white translate-x-0.5" />}
                </div>
              </button>

              {/* Bottom-left timecode */}
              <div className="absolute bottom-3 left-4 flex items-center gap-2 pointer-events-none">
                <span className="rounded-md bg-black/70 px-2 py-0.5 font-mono text-xs font-semibold text-white/80 backdrop-blur-sm tabular-nums">
                  {fmt(currentTime)}
                </span>
                <span className="text-white/30 text-xs">/</span>
                <span className="rounded-md bg-black/50 px-2 py-0.5 font-mono text-xs text-white/40 backdrop-blur-sm tabular-nums">
                  {fmt(duration)}
                </span>
              </div>

              {/* Top-right file name */}
              <div className="absolute right-3 top-3 rounded-lg bg-black/60 px-2.5 py-1 backdrop-blur-sm">
                <p className="max-w-[200px] truncate text-[11px] font-medium text-white/50">{file.name}</p>
              </div>
            </div>

            {/* ── Timeline card ── */}
            <div className="rounded-2xl bg-[#0d1117] ring-1 ring-white/[0.07] overflow-hidden">

              {/* Time ruler */}
              <div className="relative h-6 border-b border-white/[0.05] px-3">
                {rulerTicks.map(t => (
                  <div
                    key={t}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: `${(t / duration) * 100}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="h-2 w-px bg-white/15" />
                    <span className="mt-0.5 font-mono text-[9px] text-white/25 tabular-nums">{fmt(t).replace(".0","")}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 space-y-3">
                {/* Track */}
                <div className="relative">
                  {/* Hover tooltip */}
                  {hoverTime !== null && hoverThumb && (
                    <div
                      className="pointer-events-none absolute z-40 flex flex-col items-center gap-1"
                      style={{ left: hoverX, bottom: "calc(100% + 8px)", transform: "translateX(-50%)" }}
                    >
                      <div className="overflow-hidden rounded-lg ring-1 ring-white/20 shadow-2xl shadow-black/80">
                        <img src={hoverThumb.url} className="h-[54px] w-24 object-cover" alt="" />
                      </div>
                      <span className="rounded-md bg-black/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-white/80 shadow-lg">
                        {fmt(hoverTime)}
                      </span>
                    </div>
                  )}

                  <div
                    ref={timelineRef}
                    className="relative h-14 cursor-pointer select-none overflow-hidden rounded-xl"
                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)" }}
                    onClick={onTimelineClick}
                    onMouseMove={onTimelineMouseMove}
                    onMouseLeave={() => setHoverTime(null)}
                  >
                    {/* Thumbnail strip */}
                    {thumbs.length > 0 && (
                      <div className="absolute inset-0 flex pointer-events-none">
                        {thumbs.map((th, i) => (
                          <img key={i} src={th.url} className="h-full flex-1 object-cover opacity-[0.32]" alt="" draggable={false} />
                        ))}
                        {/* vignette overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />
                      </div>
                    )}

                    {/* Segment regions */}
                    {segments.map((seg, idx) => {
                      const c = col(idx);
                      const sPct = duration > 0 ? (seg.start / duration) * 100 : 0;
                      const ePct = duration > 0 ? (seg.end   / duration) * 100 : 100;
                      const isActive = seg.id === activeId;
                      return (
                        <div key={seg.id}>
                          {/* Filled region */}
                          <div
                            className={`absolute inset-y-0 transition-opacity ${c.region} ${isActive ? "opacity-100" : "opacity-50"}`}
                            style={{ left: `${sPct}%`, right: `${100 - ePct}%` }}
                            onClick={e => { e.stopPropagation(); setActiveId(seg.id); }}
                          />
                          {/* Top & bottom border lines */}
                          {isActive && (
                            <div
                              className={`absolute inset-y-0 border-y ${c.border}`}
                              style={{ left: `${sPct}%`, right: `${100 - ePct}%` }}
                            />
                          )}
                          {/* Handles */}
                          {isActive && (
                            <>
                              {[["start", sPct] as const, ["end", ePct] as const].map(([handle, pct]) => (
                                <div
                                  key={handle}
                                  className="absolute inset-y-0 z-20 flex cursor-ew-resize items-center"
                                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                                  onMouseDown={e => onHandleMouseDown(e, seg.id, handle)}
                                >
                                  <div className={`flex h-full w-4 flex-col items-center justify-center gap-[3px] ${c.bar} shadow-lg ${handle === "start" ? "rounded-l-lg" : "rounded-r-lg"}`}>
                                    <div className="h-3.5 w-0.5 rounded-full bg-white/80" />
                                    <div className="h-3.5 w-0.5 rounded-full bg-white/80" />
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Playhead */}
                    <div
                      className="absolute inset-y-0 z-30 pointer-events-none"
                      style={{ left: `${curPct}%` }}
                    >
                      {/* head triangle */}
                      <div className="absolute -top-0 left-1/2 -translate-x-1/2 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-white/80" />
                      <div className="absolute inset-y-0 w-px bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.6)]" style={{ left: "50%" }} />
                    </div>

                    {/* Hover ghost */}
                    {hoverTime !== null && (
                      <div className="absolute inset-y-0 z-10 w-px bg-white/20 pointer-events-none" style={{ left: hoverX }} />
                    )}
                  </div>
                </div>

                {/* ── Segment time rows ── */}
                <div className="space-y-1.5">
                  {segments.map((seg, idx) => {
                    const c = col(idx); const isActive = seg.id === activeId;
                    return (
                      <div
                        key={seg.id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition-all ${isActive
                          ? `${c.border} bg-white/[0.04]`
                          : "border-white/[0.05] bg-transparent hover:border-white/10"}`}
                        onClick={() => setActiveId(seg.id)}
                      >
                        {/* Dot */}
                        <div className={`h-2 w-2 shrink-0 rounded-full ${c.bar}`} />
                        <span className={`w-16 shrink-0 text-[10px] font-bold uppercase tracking-widest ${isActive ? c.text : "text-white/30"}`}>
                          Seg {idx + 1}
                        </span>

                        {/* Start time */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20">IN</span>
                          <input
                            className="w-[82px] rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 py-1.5 font-mono text-xs font-semibold text-white outline-none focus:border-emerald-500/50 focus:bg-emerald-500/[0.07] transition-colors"
                            defaultValue={fmt(seg.start)} key={`s-${seg.id}-${seg.start.toFixed(1)}`}
                            onBlur={e => updateSeg(seg.id, { start: Math.max(0, Math.min(parseFmt(e.target.value), seg.end - 0.1)) })}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                        <div className="h-px w-4 shrink-0 bg-white/15" />
                        {/* End time */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20">OUT</span>
                          <input
                            className="w-[82px] rounded-lg border border-white/[0.08] bg-white/[0.05] px-2.5 py-1.5 font-mono text-xs font-semibold text-white outline-none focus:border-emerald-500/50 focus:bg-emerald-500/[0.07] transition-colors"
                            defaultValue={fmt(seg.end)} key={`e-${seg.id}-${seg.end.toFixed(1)}`}
                            onBlur={e => updateSeg(seg.id, { end: Math.min(duration, Math.max(parseFmt(e.target.value), seg.start + 0.1)) })}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>

                        {/* Duration badge */}
                        <div className={`ml-auto rounded-md px-2 py-1 font-mono text-[11px] font-bold ${isActive ? `${c.bar} bg-opacity-20 ${c.text}` : "text-white/25"}`}>
                          {fmt(seg.end - seg.start)}
                        </div>

                        {segments.length > 1 && (
                          <button
                            onClick={e => { e.stopPropagation(); removeSegment(seg.id); }}
                            className="shrink-0 rounded-lg p-1 text-white/15 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {segments.length < 5 && (
                    <button
                      onClick={addSegment}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.07] py-2 text-[11px] font-semibold text-white/25 hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add segment
                    </button>
                  )}
                </div>

                {/* Total duration bar */}
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 text-xs border border-white/[0.05]">
                  <div className="flex items-center gap-2 text-white/35">
                    <span>{segments.length} segment{segments.length > 1 ? "s" : ""}</span>
                    {opts.speed !== 1 && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">{opts.speed}x</span>}
                    {opts.crop !== "original" && <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">{opts.crop}</span>}
                    {opts.rotate !== "none" && <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-400">{opts.rotate}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/30">Selected</span>
                    <span className="font-mono font-bold text-emerald-400 tabular-nums">{fmt(totalSelected)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Social Presets ── */}
            <div className="grid grid-cols-4 gap-2">
              {SOCIAL_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className="group flex flex-col gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]"
                >
                  <div className="flex items-center gap-2">
                    <p.icon className="h-3.5 w-3.5 text-white/35 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">{p.label}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-white/25">{p.sub}</span>
                </button>
              ))}
            </div>

            {/* ── Export options toggle ── */}
            <div className="rounded-2xl bg-[#0d1117] ring-1 ring-white/[0.07] overflow-hidden">
              <button
                onClick={() => setShowOpts(v => !v)}
                className="flex w-full items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-2.5">
                  <Settings2 className="h-4 w-4 text-white/40" />
                  <span className="text-sm font-semibold text-white/70">Export Settings</span>
                  {/* Active setting badges */}
                  <div className="flex items-center gap-1.5">
                    {opts.format !== "mp4" && <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-white/50 uppercase">{opts.format}</span>}
                    {opts.quality !== "medium" && <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-white/50 capitalize">{opts.quality}</span>}
                    {opts.resolution !== "original" && <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-white/50">{opts.resolution}</span>}
                    {opts.speed !== 1 && <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-white/50">{opts.speed}x</span>}
                    {opts.crop !== "original" && <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-white/50">{opts.crop}</span>}
                    {opts.muteAudio && <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">muted</span>}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${showOpts ? "rotate-180" : ""}`} />
              </button>

              {showOpts && (
                <div className="border-t border-white/[0.05] px-5 pb-5 pt-4 space-y-5">

                  {/* 2-column grid for compact options */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    {/* Crop */}
                    <div className="space-y-2">
                      <SectionLabel><Crop className="inline h-2.5 w-2.5 mr-1" />Crop / Aspect</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {(["original", "16:9", "9:16", "1:1"] as CropAspect[]).map(c => (
                          <OptionPill key={c} active={opts.crop === c} onClick={() => setOpt("crop", c)}>
                            {c === "original" ? "Original" : c}
                          </OptionPill>
                        ))}
                      </div>
                    </div>

                    {/* Speed */}
                    <div className="space-y-2">
                      <SectionLabel>Speed</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {SPEEDS.map(s => (
                          <OptionPill key={s} active={opts.speed === s} onClick={() => setOpt("speed", s)}>{s}x</OptionPill>
                        ))}
                      </div>
                    </div>

                    {/* Rotate */}
                    <div className="space-y-2">
                      <SectionLabel><RotateCw className="inline h-2.5 w-2.5 mr-1" />Rotate / Flip</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          ["none",  "None",   null],
                          ["90cw",  "90° CW", RotateCw],
                          ["90ccw", "90° CCW",RotateCcw],
                          ["180",   "180°",   null],
                          ["hflip", "H-Flip", FlipHorizontal],
                          ["vflip", "V-Flip", FlipVertical],
                        ] as [RotateFlip, string, React.FC<{ className?: string }> | null][]).map(([v, label, Icon]) => (
                          <OptionPill key={v} active={opts.rotate === v} onClick={() => setOpt("rotate", v)}>
                            {Icon && <Icon className="inline h-2.5 w-2.5 mr-1" />}{label}
                          </OptionPill>
                        ))}
                      </div>
                    </div>

                    {/* Format */}
                    <div className="space-y-2">
                      <SectionLabel>Format</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {(["mp4","webm","gif","m4a"] as OutputFormat[]).map(f => (
                          <OptionPill key={f} active={opts.format === f} onClick={() => { setOpt("format", f); setOpt("audioOnly", f === "m4a"); }}>
                            {f === "m4a" ? "M4A" : f.toUpperCase()}
                          </OptionPill>
                        ))}
                      </div>
                    </div>

                    {/* Quality */}
                    {opts.format !== "gif" && opts.format !== "m4a" && (
                      <div className="space-y-2">
                        <SectionLabel>Quality</SectionLabel>
                        <div className="flex gap-1.5">
                          {(["high","medium","compressed"] as Quality[]).map(q => (
                            <OptionPill key={q} active={opts.quality === q} onClick={() => setOpt("quality", q)}>
                              {q.charAt(0).toUpperCase() + q.slice(1)}
                            </OptionPill>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution */}
                    {opts.format !== "gif" && opts.format !== "m4a" && (
                      <div className="space-y-2">
                        <SectionLabel>Resolution</SectionLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {(["original","1080p","720p","480p"] as Resolution[]).map(r => (
                            <OptionPill key={r} active={opts.resolution === r} onClick={() => setOpt("resolution", r)}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </OptionPill>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fade + Mute row */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-4">
                    <OptionPill active={opts.fadeIn}  onClick={() => setOpt("fadeIn",  !opts.fadeIn)}>Fade In</OptionPill>
                    <OptionPill active={opts.fadeOut} onClick={() => setOpt("fadeOut", !opts.fadeOut)}>Fade Out</OptionPill>
                    {(opts.fadeIn || opts.fadeOut) && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <span className="text-[10px] text-white/25 font-semibold uppercase tracking-widest">Duration</span>
                        {[0.5,1,2].map(d => <OptionPill key={d} active={opts.fadeDuration === d} onClick={() => setOpt("fadeDuration", d)}>{d}s</OptionPill>)}
                      </div>
                    )}
                    {opts.format !== "gif" && opts.format !== "m4a" && (
                      <button
                        onClick={() => setOpt("muteAudio", !opts.muteAudio)}
                        className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${opts.muteAudio ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" : "border border-white/[0.08] bg-white/[0.04] text-white/40 hover:text-rose-400"}`}
                      >
                        {opts.muteAudio ? <VolumeX className="h-3.5 w-3.5" /> : <Music className="h-3.5 w-3.5" />}
                        {opts.muteAudio ? "Muted" : "Mute audio"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Action buttons ── */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={togglePlay} disabled={stage === "processing"}
                className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.09] disabled:opacity-40 transition-colors"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : "Preview"}
              </button>
              {stage !== "processing" && (
                <button
                  onClick={() => { if (videoRef.current) { videoRef.current.currentTime = activeSeg.start; setCurrentTime(activeSeg.start); } }}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <RotateCcw className="h-4 w-4" /> Jump to start
                </button>
              )}
              <div className="ml-auto flex gap-2.5">
                <button onClick={reset} className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-sm font-semibold text-white/40 hover:text-white transition-colors">
                  Change file
                </button>
                {stage !== "processing" && stage !== "done" && (
                  <button
                    onClick={processVideo}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-400 transition-all"
                  >
                    <Scissors className="h-4 w-4" />
                    {segments.length > 1 ? `Export ${segments.length} Segments` : "Export Video"}
                  </button>
                )}
              </div>
            </div>

            {/* ── Processing bar ── */}
            {stage === "processing" && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">{progressMsg}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-400">{progress}%</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2.5 text-xs text-white/20">First run downloads the FFmpeg engine (~30 MB). Subsequent exports are instant.</p>
              </div>
            )}

            {/* ── Done banner ── */}
            {stage === "done" && outputUrl && (
              <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05]">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-emerald-400">Your clip is ready!</p>
                    <p className="mt-0.5 text-xs text-white/35 truncate">
                      {segments.length} segment{segments.length > 1 ? "s" : ""} · {fmt(totalSelected / opts.speed)} · {opts.format.toUpperCase()}
                      {opts.crop !== "original" ? ` · ${opts.crop}` : ""}
                      {opts.rotate !== "none" ? ` · ${opts.rotate}` : ""}
                    </p>
                  </div>
                  <a
                    href={outputUrl} download={outputName}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-400 transition-all"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                </div>
                <div className="flex gap-2 border-t border-white/[0.05] px-5 py-3">
                  <button onClick={processVideo} className="text-xs font-semibold text-white/30 hover:text-white transition-colors">
                    Re-export with different settings →
                  </button>
                  <span className="text-white/15">·</span>
                  <button onClick={reset} className="text-xs font-semibold text-white/30 hover:text-white transition-colors">
                    New file
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Error ── */}
        {stage === "error" && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <p className="font-bold text-rose-400">Processing failed</p>
                <p className="mt-1 text-sm text-white/50">{error}</p>
                <p className="mt-2 text-xs text-white/25">Use Chrome or Edge. SharedArrayBuffer must be supported.</p>
              </div>
            </div>
            <button onClick={() => { setStage("ready"); setError(""); }} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/50 hover:text-white transition-colors">
              Try again
            </button>
          </div>
        )}
      </section>

      {/* ── Features ── */}
      <section className="border-t border-white/[0.05] px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-black text-white sm:text-3xl">
            Why use AutoClipr Video Slicer?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <div key={f.title} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-emerald-500/20 hover:bg-white/[0.04]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/15">
                  <f.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="font-bold text-white">{f.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/40">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Formats ── */}
      <section className="border-t border-white/[0.05] px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-2 text-xl font-black text-white">Supported Input Formats</h2>
          <p className="mb-8 text-sm text-white/35">All popular video formats — no conversion needed before importing</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["MP4","MOV","AVI","MKV","WebM","WMV","FLV","M4V","TS","3GP","OGV","RM","RMVB"].map(f => (
              <span key={f} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/50">{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/[0.05] px-4 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-black text-white sm:text-3xl">Ready to edit your video?</h2>
          <p className="mt-3 text-white/40">Free, instant, private. No account required.</p>
          <button
            onClick={() => { reset(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-10 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-900/30 transition-all hover:bg-emerald-400 hover:shadow-emerald-900/50"
          >
            <Scissors className="h-4 w-4" /> Edit Video Now
          </button>
          <div className="mt-6">
            <Link href="/tools" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to all free tools
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

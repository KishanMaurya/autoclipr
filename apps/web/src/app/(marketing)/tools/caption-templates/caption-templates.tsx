"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, Download, FileVideo, Zap, ShieldCheck, Globe,
  Loader2, AlertCircle, X, Type, Film, RefreshCw, Info,
  Plus, Trash2, Edit3, Save, ChevronDown, Play, Pause,
  AlignCenter, AlignLeft, AlignRight, Bold, Italic,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "ready" | "processing" | "done" | "error";
type Align = "left" | "center" | "right";
type VAlign = "top" | "middle" | "bottom";

interface CaptionEntry {
  id: string;
  start: number;
  end: number;
  text: string;
}

interface Template {
  id: string;
  label: string;
  description: string;
  preview: string; // CSS classes / style hint for canvas
  // ASS style fields
  fontName: string;
  fontSize: number;
  primaryColor: string;   // &HAABBGGRR (ASS)
  outlineColor: string;
  backColor: string;
  bold: boolean;
  italic: boolean;
  outline: number;
  shadow: number;
  borderStyle: number;    // 1=outline+shadow, 3=opaque box
  alignment: number;      // ASS alignment numpad (2=bottom-center, 8=top-center, etc.)
  marginV: number;
  paddingBox: boolean;
  bgOpacity: number;      // 0-255 for the box (255=opaque)
  // Canvas preview colours
  canvasText: string;
  canvasBg: string;
  canvasOutline: string;
  canvasGlow: string;
}

interface StyleOpts {
  template: string;
  fontSize: number;
  align: Align;
  vAlign: VAlign;
  bold: boolean;
  italic: boolean;
  textColor: string;
  outlineColor: string;
  bgColor: string;
  bgOpacity: number;
  marginV: number;
  outputFormat: string;
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Template[] = [
  {
    id: "bold",
    label: "Bold",
    description: "Large white text, thick black outline",
    preview: "bold",
    fontName: "Arial",
    fontSize: 52,
    primaryColor: "&H00FFFFFF",
    outlineColor: "&H00000000",
    backColor: "&H00000000",
    bold: true,
    italic: false,
    outline: 3,
    shadow: 1,
    borderStyle: 1,
    alignment: 2,
    marginV: 40,
    paddingBox: false,
    bgOpacity: 0,
    canvasText: "#ffffff",
    canvasBg: "transparent",
    canvasOutline: "#000000",
    canvasGlow: "",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean white text with subtle shadow",
    preview: "minimal",
    fontName: "Arial",
    fontSize: 40,
    primaryColor: "&H00FFFFFF",
    outlineColor: "&H80000000",
    backColor: "&H00000000",
    bold: false,
    italic: false,
    outline: 1,
    shadow: 2,
    borderStyle: 1,
    alignment: 2,
    marginV: 30,
    paddingBox: false,
    bgOpacity: 0,
    canvasText: "#ffffff",
    canvasBg: "transparent",
    canvasOutline: "rgba(0,0,0,0.5)",
    canvasGlow: "",
  },
  {
    id: "cinema",
    label: "Cinema",
    description: "White text on dark semi-transparent bar",
    preview: "cinema",
    fontName: "Arial",
    fontSize: 42,
    primaryColor: "&H00FFFFFF",
    outlineColor: "&H00000000",
    backColor: "&HAA000000",
    bold: false,
    italic: false,
    outline: 0,
    shadow: 0,
    borderStyle: 3,
    alignment: 2,
    marginV: 0,
    paddingBox: true,
    bgOpacity: 180,
    canvasText: "#ffffff",
    canvasBg: "rgba(0,0,0,0.7)",
    canvasOutline: "",
    canvasGlow: "",
  },
  {
    id: "neon",
    label: "Neon",
    description: "Glowing cyan text — social-first look",
    preview: "neon",
    fontName: "Arial",
    fontSize: 50,
    primaryColor: "&H0000FFFF",
    outlineColor: "&H00007777",
    backColor: "&H00000000",
    bold: true,
    italic: false,
    outline: 2,
    shadow: 3,
    borderStyle: 1,
    alignment: 2,
    marginV: 40,
    paddingBox: false,
    bgOpacity: 0,
    canvasText: "#00ffff",
    canvasBg: "transparent",
    canvasOutline: "#006666",
    canvasGlow: "#00ffff",
  },
  {
    id: "fire",
    label: "Fire",
    description: "Hot orange text with red glow",
    preview: "fire",
    fontName: "Arial",
    fontSize: 52,
    primaryColor: "&H0022AAFF",
    outlineColor: "&H000033AA",
    backColor: "&H00000000",
    bold: true,
    italic: false,
    outline: 3,
    shadow: 2,
    borderStyle: 1,
    alignment: 2,
    marginV: 40,
    paddingBox: false,
    bgOpacity: 0,
    canvasText: "#ff9900",
    canvasBg: "transparent",
    canvasOutline: "#cc3300",
    canvasGlow: "#ff4400",
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "White pill bubble — viral social style",
    preview: "tiktok",
    fontName: "Arial",
    fontSize: 46,
    primaryColor: "&H00000000",
    outlineColor: "&H00FFFFFF",
    backColor: "&HFFFFFFFF",
    bold: true,
    italic: false,
    outline: 0,
    shadow: 0,
    borderStyle: 3,
    alignment: 2,
    marginV: 60,
    paddingBox: true,
    bgOpacity: 255,
    canvasText: "#000000",
    canvasBg: "#ffffff",
    canvasOutline: "",
    canvasGlow: "",
  },
  {
    id: "karaoke",
    label: "Karaoke",
    description: "Yellow highlight on white — music-video style",
    preview: "karaoke",
    fontName: "Arial",
    fontSize: 50,
    primaryColor: "&H0000FFFF",
    outlineColor: "&H00000000",
    backColor: "&H00000000",
    bold: true,
    italic: false,
    outline: 2,
    shadow: 1,
    borderStyle: 1,
    alignment: 2,
    marginV: 40,
    paddingBox: false,
    bgOpacity: 0,
    canvasText: "#ffff00",
    canvasBg: "transparent",
    canvasOutline: "#000000",
    canvasGlow: "",
  },
  {
    id: "subtitle",
    label: "Subtitle",
    description: "Classic film subtitles on dark strip",
    preview: "subtitle",
    fontName: "Arial",
    fontSize: 36,
    primaryColor: "&H00FFFFFF",
    outlineColor: "&H00000000",
    backColor: "&HC8000000",
    bold: false,
    italic: false,
    outline: 0,
    shadow: 0,
    borderStyle: 3,
    alignment: 2,
    marginV: 20,
    paddingBox: true,
    bgOpacity: 200,
    canvasText: "#ffffff",
    canvasBg: "rgba(0,0,0,0.8)",
    canvasOutline: "",
    canvasGlow: "",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function fmtBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function toAssTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.round((s % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "00")}`;
}

function parseSrt(raw: string): CaptionEntry[] {
  const entries: CaptionEntry[] = [];
  const blocks = raw.trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const timeLine = lines[1];
    const match = timeLine.match(
      /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/
    );
    if (!match) continue;
    const toSec = (h: string, m: string, s: string, ms: string) =>
      +h * 3600 + +m * 60 + +s + +ms / 1000;
    const start = toSec(match[1], match[2], match[3], match[4]);
    const end   = toSec(match[5], match[6], match[7], match[8]);
    const text  = lines.slice(2).join("\n").replace(/<[^>]+>/g, "").trim();
    entries.push({ id: uid(), start, end, text });
  }
  return entries;
}

function buildAss(captions: CaptionEntry[], tpl: Template, opts: StyleOpts, vw: number, vh: number): string {
  const fontSize = Math.round(tpl.fontSize * (opts.fontSize / 100));
  const assAlign = opts.vAlign === "top" ? (opts.align === "left" ? 7 : opts.align === "right" ? 9 : 8)
    : opts.vAlign === "middle" ? (opts.align === "left" ? 4 : opts.align === "right" ? 6 : 5)
    : (opts.align === "left" ? 1 : opts.align === "right" ? 3 : 2);

  const hexToAss = (hex: string, alpha = 0) => {
    const c = hex.replace("#", "");
    const r = c.slice(0, 2); const g = c.slice(2, 4); const b = c.slice(4, 6);
    const a = alpha.toString(16).padStart(2, "0").toUpperCase();
    return `&H${a}${b}${g}${r}`.toUpperCase();
  };

  const primary  = hexToAss(opts.textColor);
  const outline  = hexToAss(opts.outlineColor);
  const bgAlpha  = Math.round(255 - opts.bgOpacity);
  const back     = hexToAss(opts.bgColor, bgAlpha);

  const marginV  = opts.marginV;
  const bold     = opts.bold ? -1 : 0;
  const italic   = opts.italic ? -1 : 0;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${vw}
PlayResY: ${vh}
Collisions: Normal

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${tpl.fontName},${fontSize},${primary},${primary},${outline},${back},${bold},${italic},0,0,100,100,0,0,${tpl.borderStyle},${tpl.outline},${tpl.shadow},${assAlign},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = captions.map(c => {
    const text = c.text.replace(/\n/g, "\\N");
    return `Dialogue: 0,${toAssTime(c.start)},${toAssTime(c.end)},Default,,0,0,0,,${text}`;
  }).join("\n");

  return `${header}\n${events}`;
}

// ─── Canvas preview renderer ──────────────────────────────────────────────────

function drawCaptionPreview(
  canvas: HTMLCanvasElement,
  text: string,
  tpl: Template,
  opts: StyleOpts,
  videoEl: HTMLVideoElement | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width; const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Draw video frame
  if (videoEl && !videoEl.paused) {
    try { ctx.drawImage(videoEl, 0, 0, W, H); } catch { /* ok */ }
  } else if (videoEl) {
    try { ctx.drawImage(videoEl, 0, 0, W, H); } catch { /* ok */ }
  }

  if (!text) return;

  const baseFontSize = Math.round(H * 0.055 * (opts.fontSize / 100));
  const fontWeight = opts.bold ? "900" : "400";
  const fontStyle  = opts.italic ? "italic" : "normal";
  ctx.font = `${fontStyle} ${fontWeight} ${baseFontSize}px Arial, sans-serif`;
  ctx.textAlign = opts.align;
  ctx.textBaseline = "bottom";

  const lines = text.split("\n");
  const lineH = baseFontSize * 1.3;
  const totalH = lines.length * lineH;

  const x = opts.align === "left" ? W * 0.05 : opts.align === "right" ? W * 0.95 : W / 2;
  const marginVpx = (opts.marginV / 100) * H;
  const y = opts.vAlign === "top" ? totalH + marginVpx
    : opts.vAlign === "middle" ? H / 2 + totalH / 2
    : H - marginVpx;

  lines.forEach((line, i) => {
    const ly = y - (lines.length - 1 - i) * lineH;

    // Measure for background box
    const metrics = ctx.measureText(line);
    const tw = metrics.width;
    const pad = baseFontSize * 0.3;

    if (tpl.canvasBg !== "transparent" && tpl.canvasBg) {
      ctx.save();
      ctx.fillStyle = tpl.canvasBg;
      const bx = opts.align === "center" ? x - tw / 2 - pad
        : opts.align === "right" ? x - tw - pad
        : x - pad;
      if (tpl.id === "tiktok") {
        const r = baseFontSize * 0.4;
        ctx.beginPath();
        ctx.roundRect(bx, ly - baseFontSize - pad, tw + pad * 2, baseFontSize + pad * 2, r);
        ctx.fill();
      } else {
        ctx.fillRect(bx, ly - baseFontSize - pad, tw + pad * 2, baseFontSize + pad * 2);
      }
      ctx.restore();
    }

    // Glow
    if (tpl.canvasGlow) {
      ctx.save();
      ctx.shadowColor = tpl.canvasGlow;
      ctx.shadowBlur = baseFontSize * 0.5;
      ctx.fillStyle = tpl.canvasText;
      ctx.fillText(line, x, ly);
      ctx.restore();
    }

    // Outline / stroke
    if (tpl.canvasOutline) {
      ctx.save();
      ctx.strokeStyle = tpl.canvasOutline;
      ctx.lineWidth = baseFontSize * 0.12;
      ctx.lineJoin = "round";
      ctx.strokeText(line, x, ly);
      ctx.restore();
    }

    // Main text
    ctx.fillStyle = tpl.canvasText;
    ctx.fillText(line, x, ly);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_OPTS: StyleOpts = {
  template: "bold",
  fontSize: 100,
  align: "center",
  vAlign: "bottom",
  bold: true,
  italic: false,
  textColor: "#ffffff",
  outlineColor: "#000000",
  bgColor: "#000000",
  bgOpacity: 180,
  marginV: 40,
  outputFormat: "mp4",
};

const SAMPLE_CAPTIONS: CaptionEntry[] = [
  { id: "s1", start: 0,  end: 3,  text: "Welcome to AutoClipr" },
  { id: "s2", start: 3,  end: 7,  text: "Add stylish captions\nto any video" },
  { id: "s3", start: 7,  end: 10, text: "Export and share instantly!" },
];

export function CaptionTemplates() {
  const [stage, setStage]             = useState<Stage>("idle");
  const [file, setFile]               = useState<File | null>(null);
  const [videoUrl, setVideoUrl]       = useState<string | null>(null);
  const [videoDims, setVideoDims]     = useState({ w: 0, h: 0, dur: 0 });
  const [captions, setCaptions]       = useState<CaptionEntry[]>(SAMPLE_CAPTIONS);
  const [opts, setOpts]               = useState<StyleOpts>(DEFAULT_OPTS);
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]             = useState("");
  const [dragging, setDragging]       = useState(false);
  const [outputUrl, setOutputUrl]     = useState<string | null>(null);
  const [outputSize, setOutputSize]   = useState(0);
  const [editId, setEditId]           = useState<string | null>(null);
  const [editText, setEditText]       = useState("");
  const [editStart, setEditStart]     = useState(0);
  const [editEnd, setEditEnd]         = useState(3);
  const [previewCap, setPreviewCap]   = useState(0); // index of caption to preview
  const [srtInput, setSrtInput]       = useState("");
  const [showSrtInput, setShowSrtInput] = useState(false);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffLoaded  = useRef(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const srtFile   = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const rafRef    = useRef<number>(0);

  const ACCEPT = "video/*,.mp4,.webm,.mov,.avi,.mkv,.flv,.wmv,.m4v,.3gp,.ts,.mts";
  const selectedTpl = TEMPLATES.find(t => t.id === opts.template)!;

  const setOpt = <K extends keyof StyleOpts>(k: K, v: StyleOpts[K]) =>
    setOpts(o => ({ ...o, [k]: v }));

  // ── Canvas preview ──
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas) return;
    const cap = captions[previewCap] ?? captions[0];
    drawCaptionPreview(canvas, cap?.text ?? "Sample Caption Text", selectedTpl, opts, video ?? null);
    rafRef.current = requestAnimationFrame(renderPreview);
  }, [captions, previewCap, opts, selectedTpl]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderPreview]);

  // ── Canvas size ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (videoDims.w > 0) {
      canvas.width  = Math.min(videoDims.w, 640);
      canvas.height = Math.round(Math.min(videoDims.w, 640) * videoDims.h / videoDims.w);
    } else {
      canvas.width = 640; canvas.height = 360;
    }
  }, [videoDims]);

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

  // ── SRT import ──
  const importSrt = () => {
    const parsed = parseSrt(srtInput);
    if (parsed.length > 0) { setCaptions(parsed); setShowSrtInput(false); setSrtInput(""); }
  };

  const onSrtFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseSrt(text);
      if (parsed.length > 0) setCaptions(parsed);
    };
    reader.readAsText(f);
  };

  // ── Caption editing ──
  const addCaption = () => {
    const last = captions[captions.length - 1];
    const start = last ? last.end + 0.5 : 0;
    const entry: CaptionEntry = { id: uid(), start, end: start + 3, text: "New caption" };
    setCaptions(c => [...c, entry]);
    startEdit(entry);
  };

  const startEdit = (c: CaptionEntry) => {
    setEditId(c.id); setEditText(c.text); setEditStart(c.start); setEditEnd(c.end);
  };

  const saveEdit = () => {
    setCaptions(cs => cs.map(c => c.id === editId ? { ...c, text: editText, start: editStart, end: editEnd } : c));
    setEditId(null);
  };

  const deleteCaption = (id: string) => setCaptions(cs => cs.filter(c => c.id !== id));

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

  // ── Burn captions ──
  const burnCaptions = async () => {
    if (!file || captions.length === 0) return;
    setStage("processing"); setProgress(5);
    setOutputUrl(null); setError("");

    try {
      setProgressMsg("Loading FFmpeg…");
      const ff = await loadFFmpeg();
      setProgress(10);

      const ext    = file.name.split(".").pop() ?? "mp4";
      const inName = `input.${ext}`;
      const assName = "captions.ass";
      const outName = `output.${opts.outputFormat}`;

      setProgressMsg("Preparing file…");
      await ff.writeFile(inName, await fetchFile(file));

      // Write ASS subtitle file
      const assContent = buildAss(captions, selectedTpl, opts, videoDims.w || 1920, videoDims.h || 1080);
      const enc = new TextEncoder();
      await ff.writeFile(assName, enc.encode(assContent));

      setProgress(15);
      setProgressMsg("Burning captions into video…");

      const ret = await ff.exec([
        "-y", "-i", inName,
        "-vf", `ass=${assName}`,
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-c:a", "aac", "-b:a", "192k",
        outName,
      ]);

      if (ret !== 0) throw new Error("Failed to burn captions. Make sure your video has a valid video track.");

      const data = await ff.readFile(outName) as Uint8Array;
      try { await ff.deleteFile(inName); await ff.deleteFile(assName); await ff.deleteFile(outName); } catch { /* ok */ }

      const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
      setOutputSize(blob.size);
      setOutputUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStage("done");
    } catch (e: any) {
      setError(e?.message ?? "Processing failed.");
      setStage("error");
    }
  };

  const download = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `${file?.name.replace(/\.[^.]+$/, "") ?? "video"}_captioned.${opts.outputFormat}`;
    a.click();
  };

  const reset = () => {
    setStage("idle"); setFile(null); setVideoUrl(null);
    setOutputUrl(null); setError(""); setProgress(0);
    setVideoDims({ w: 0, h: 0, dur: 0 });
  };

  return (
    <div className="min-h-screen bg-[#07080f] px-4 py-10 text-white">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ── */}
        <div className="mb-8">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Tools
          </Link>
          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/20">
              <Type className="h-7 w-7 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold sm:text-3xl">Caption Templates</h1>
                <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-400">Free</span>
              </div>
              <p className="mt-1 text-white/50 text-sm">Burn stylish captions into any video. Choose a template, add captions, export in seconds.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: <ShieldCheck className="h-3 w-3" />, label: "100% Private" },
              { icon: <Globe       className="h-3 w-3" />, label: "No Upload" },
              { icon: <Zap         className="h-3 w-3" />, label: "Browser-side" },
              { icon: <Type        className="h-3 w-3" />, label: "8 Templates" },
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
              ${dragging ? "border-rose-400 bg-rose-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"}`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white">Drop your video here</p>
              <p className="mt-1 text-sm text-white/40">MP4, MOV, AVI, MKV, WebM, FLV, TS, 3GP…</p>
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          </div>
        )}

        {/* ── Workspace ── */}
        {stage !== "idle" && (
          <div className="grid gap-4 xl:grid-cols-[1fr_420px]">

            {/* Left — preview + caption list */}
            <div className="space-y-4">

              {/* File bar */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                  <FileVideo className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{file?.name}</p>
                  <p className="text-xs text-white/40">{fmtBytes(file?.size ?? 0)} · {videoDims.dur > 0 ? fmtTime(videoDims.dur) : "—"} · {videoDims.w > 0 ? `${videoDims.w}×${videoDims.h}` : ""}</p>
                </div>
                <button onClick={reset} className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white/70 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Canvas live preview */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
                {/* Hidden video for canvas source */}
                {videoUrl && (
                  <video
                    ref={videoRef} src={videoUrl}
                    className="hidden"
                    onLoadedMetadata={onMeta}
                    loop muted autoPlay playsInline
                  />
                )}
                <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: videoDims.w > 0 ? `${videoDims.w}/${videoDims.h}` : "16/9" }} />
                {/* Preview badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white/70 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                  Live Preview · {selectedTpl.label}
                </div>
                {/* Caption selector */}
                {captions.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {captions.map((_, i) => (
                      <button key={i} onClick={() => setPreviewCap(i)}
                        className={`h-1.5 rounded-full transition-all ${previewCap === i ? "w-6 bg-rose-400" : "w-1.5 bg-white/30"}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Progress */}
              {stage === "processing" && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
                    <p className="font-semibold text-white">{progressMsg}</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
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
                    <p className="font-semibold text-red-300">Processing failed</p>
                    <p className="mt-1 text-sm text-red-300/70">{error}</p>
                  </div>
                </div>
              )}

              {/* Done */}
              {stage === "done" && outputUrl && (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border border-rose-500/20 bg-black">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Output Preview</span>
                      <span className="text-xs text-white/40">{fmtBytes(outputSize)}</span>
                    </div>
                    <video src={outputUrl} controls className="w-full max-h-64" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={download}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 py-4 text-sm font-bold text-white transition hover:from-rose-500 hover:to-pink-500 active:scale-[0.98]">
                      <Download className="h-4 w-4" /> Download Video
                    </button>
                    <button onClick={() => setStage("ready")}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 text-sm text-white/50 hover:text-white transition-colors flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Caption list */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Captions ({captions.length})</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => srtFile.current?.click()}
                      className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[10px] font-semibold text-white/40 hover:text-white/70 transition-colors">
                      Import SRT
                    </button>
                    <button onClick={() => setShowSrtInput(s => !s)}
                      className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[10px] font-semibold text-white/40 hover:text-white/70 transition-colors">
                      Paste SRT
                    </button>
                    <button onClick={addCaption}
                      className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/30 transition-colors">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                  <input ref={srtFile} type="file" accept=".srt,.vtt,.txt" className="hidden" onChange={onSrtFile} />
                </div>

                {/* SRT paste area */}
                {showSrtInput && (
                  <div className="border-b border-white/[0.06] p-4 space-y-2">
                    <textarea
                      value={srtInput}
                      onChange={e => setSrtInput(e.target.value)}
                      placeholder={"1\n00:00:01,000 --> 00:00:04,000\nYour caption text here\n\n2\n..."}
                      rows={6}
                      className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 font-mono text-xs text-white/70 placeholder-white/20 focus:outline-none focus:border-rose-500/50"
                    />
                    <div className="flex gap-2">
                      <button onClick={importSrt}
                        className="rounded-xl bg-rose-500/20 px-4 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/30 transition-colors">
                        Import
                      </button>
                      <button onClick={() => setShowSrtInput(false)}
                        className="rounded-xl border border-white/[0.08] px-4 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Caption rows */}
                <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                  {captions.map((cap, i) => (
                    <div key={cap.id}
                      onClick={() => setPreviewCap(i)}
                      className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                        ${previewCap === i ? "bg-rose-500/5" : "hover:bg-white/[0.02]"}`}>
                      <span className="shrink-0 mt-1 font-mono text-[10px] text-white/25">{String(i + 1).padStart(2, "0")}</span>
                      <div className="flex-1 min-w-0">
                        {editId === cap.id ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                              className="w-full resize-none rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500/50" />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[9px] text-white/30 mb-0.5">Start (s)</p>
                                <input type="number" step="0.1" value={editStart} onChange={e => setEditStart(+e.target.value)}
                                  className="w-full rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-white focus:outline-none" />
                              </div>
                              <div>
                                <p className="text-[9px] text-white/30 mb-0.5">End (s)</p>
                                <input type="number" step="0.1" value={editEnd} onChange={e => setEditEnd(+e.target.value)}
                                  className="w-full rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-white focus:outline-none" />
                              </div>
                            </div>
                            <button onClick={saveEdit}
                              className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/30">
                              <Save className="h-3 w-3" /> Save
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">{cap.text}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-white/25">
                              {fmtTime(cap.start)} → {fmtTime(cap.end)}
                            </p>
                          </>
                        )}
                      </div>
                      {editId !== cap.id && (
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}>
                          <button onClick={() => startEdit(cap)}
                            className="rounded p-1 text-white/30 hover:bg-white/[0.06] hover:text-white/70">
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button onClick={() => deleteCaption(cap.id)}
                            className="rounded p-1 text-white/30 hover:bg-white/[0.06] hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — style settings */}
            <div className="space-y-4">

              {/* Template picker */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Style Template</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setOpt("template", t.id)}
                      className={`relative overflow-hidden rounded-xl border px-3 py-3 text-left transition-all
                        ${opts.template === t.id
                          ? "border-rose-500/50 bg-rose-500/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"}`}>
                      {/* Mini style preview */}
                      <div className="mb-2 flex h-8 items-center justify-center rounded-lg overflow-hidden"
                        style={{ background: t.canvasBg !== "transparent" && t.canvasBg ? t.canvasBg : "#111" }}>
                        <span className="text-[11px] font-black px-1"
                          style={{
                            color: t.canvasText,
                            textShadow: t.canvasGlow
                              ? `0 0 8px ${t.canvasGlow}, 0 0 16px ${t.canvasGlow}`
                              : t.canvasOutline ? `1px 1px 0 ${t.canvasOutline}, -1px -1px 0 ${t.canvasOutline}` : "none",
                          }}>
                          Aa
                        </span>
                      </div>
                      <p className={`text-[11px] font-semibold ${opts.template === t.id ? "text-rose-300" : "text-white/60"}`}>{t.label}</p>
                      <p className="text-[9px] text-white/25 leading-tight mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text style */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Text Style</p>

                {/* Font size */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-white/40">Font Size</p>
                    <span className="text-xs text-rose-400 font-mono">{opts.fontSize}%</span>
                  </div>
                  <input type="range" min={50} max={200} step={5} value={opts.fontSize}
                    onChange={e => setOpt("fontSize", +e.target.value)}
                    className="w-full accent-rose-500" />
                </div>

                {/* Align */}
                <div>
                  <p className="mb-2 text-xs text-white/40">Alignment</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["left", "center", "right"] as Align[]).map(a => (
                      <button key={a} onClick={() => setOpt("align", a)}
                        className={`flex items-center justify-center rounded-xl border py-2 transition-all
                          ${opts.align === a ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-white/[0.06] text-white/40 hover:border-white/10"}`}>
                        {a === "left" ? <AlignLeft className="h-4 w-4" /> : a === "center" ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vertical position */}
                <div>
                  <p className="mb-2 text-xs text-white/40">Vertical Position</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["top", "middle", "bottom"] as VAlign[]).map(v => (
                      <button key={v} onClick={() => setOpt("vAlign", v)}
                        className={`rounded-xl border py-2 text-xs capitalize transition-all
                          ${opts.vAlign === v ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bold / Italic */}
                <div className="flex gap-2">
                  <button onClick={() => setOpt("bold", !opts.bold)}
                    className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-all
                      ${opts.bold ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-white/[0.06] text-white/40 hover:border-white/10"}`}>
                    <Bold className="h-3.5 w-3.5" /> Bold
                  </button>
                  <button onClick={() => setOpt("italic", !opts.italic)}
                    className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs italic transition-all
                      ${opts.italic ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-white/[0.06] text-white/40 hover:border-white/10"}`}>
                    <Italic className="h-3.5 w-3.5" /> Italic
                  </button>
                </div>

                {/* Margin from edge */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-white/40">Margin from edge</p>
                    <span className="text-xs text-rose-400 font-mono">{opts.marginV}px</span>
                  </div>
                  <input type="range" min={0} max={200} step={5} value={opts.marginV}
                    onChange={e => setOpt("marginV", +e.target.value)}
                    className="w-full accent-rose-500" />
                </div>
              </div>

              {/* Colors */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Colors</p>
                {[
                  { label: "Text", key: "textColor" as const },
                  { label: "Outline / Shadow", key: "outlineColor" as const },
                  { label: "Background", key: "bgColor" as const },
                ].map(c => (
                  <div key={c.key} className="flex items-center gap-3">
                    <p className="w-28 text-xs text-white/40">{c.label}</p>
                    <input type="color" value={opts[c.key] as string}
                      onChange={e => setOpt(c.key, e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded-lg border-0 bg-transparent" />
                    <span className="font-mono text-xs text-white/30">{opts[c.key] as string}</span>
                  </div>
                ))}

                {/* Background opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-white/40">Background opacity</p>
                    <span className="text-xs text-rose-400 font-mono">{Math.round(opts.bgOpacity / 255 * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={255} value={opts.bgOpacity}
                    onChange={e => setOpt("bgOpacity", +e.target.value)}
                    className="w-full accent-rose-500" />
                </div>
              </div>

              {/* Output format */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Output Format</p>
                <div className="grid grid-cols-4 gap-2">
                  {["mp4", "webm", "mov", "mkv"].map(f => (
                    <button key={f} onClick={() => setOpt("outputFormat", f)}
                      className={`rounded-xl border py-2 text-xs font-bold uppercase transition-all
                        ${opts.outputFormat === f
                          ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                          : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Burn button */}
              {(stage === "ready" || stage === "error") && (
                <button onClick={burnCaptions}
                  disabled={captions.length === 0}
                  className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 py-4 text-sm font-bold text-white transition hover:from-rose-500 hover:to-pink-500 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
                  <Film className="h-4 w-4" />
                  Burn Captions into Video
                </button>
              )}

              {/* Info */}
              <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
                <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-300/70 leading-relaxed">
                  Captions are <span className="font-semibold text-amber-300">permanently burned</span> into the video using the ASS subtitle format — no separate file needed for playback.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Feature cards ── */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: <Type     className="h-5 w-5 text-rose-400"    />, title: "8 Caption Styles",  body: "Bold, Minimal, Cinema, Neon, Fire, TikTok, Karaoke, Subtitle — pick and preview instantly." },
            { icon: <Film     className="h-5 w-5 text-pink-400"    />, title: "Permanently Burned", body: "Captions are encoded directly into the video — no subtitle file needed for sharing." },
            { icon: <Zap      className="h-5 w-5 text-fuchsia-400" />, title: "Import SRT / VTT",  body: "Already have subtitles? Import your SRT or paste the content directly to style them." },
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

        <div className="mt-6 rounded-2xl border border-blue-500/15 bg-blue-500/5 px-5 py-4 flex items-start gap-3">
          <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
          <p className="text-xs text-blue-300/70 leading-relaxed">
            <span className="font-semibold text-blue-300">Tip:</span> Use the Caption Generator tool to auto-transcribe your video first, then export as SRT and import it here to apply a style template.
          </p>
        </div>
      </div>
    </div>
  );
}

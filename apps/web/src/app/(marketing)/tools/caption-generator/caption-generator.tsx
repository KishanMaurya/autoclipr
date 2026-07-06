"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, Download, FileVideo, Zap, ShieldCheck, Globe,
  Captions, CheckCircle, AlertCircle, Loader2, Play, Pause,
  X, Settings2, ChevronDown, Mic, FileText, Clock, Languages,
  Copy, Check, Edit3, Save, Trash2, Plus, Volume2,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "ready" | "extracting" | "transcribing" | "done" | "error";

interface CaptionEntry {
  id: string;
  start: number;  // seconds
  end: number;
  text: string;
  editing?: boolean;
}

interface TranscribeOpts {
  language: string;
  maxLineLength: number;
  maxLineDuration: number;
  punctuation: boolean;
}

// ─── Language map ─────────────────────────────────────────────────────────────

const LANGUAGES: { code: string; label: string; native: string }[] = [
  { code: "en-US", label: "English (US)", native: "English" },
  { code: "en-GB", label: "English (UK)", native: "English UK" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { code: "es-ES", label: "Spanish", native: "Español" },
  { code: "fr-FR", label: "French", native: "Français" },
  { code: "de-DE", label: "German", native: "Deutsch" },
  { code: "pt-BR", label: "Portuguese", native: "Português" },
  { code: "ja-JP", label: "Japanese", native: "日本語" },
  { code: "ko-KR", label: "Korean", native: "한국어" },
  { code: "zh-CN", label: "Chinese (Simplified)", native: "中文" },
  { code: "ar-SA", label: "Arabic", native: "العربية" },
  { code: "ru-RU", label: "Russian", native: "Русский" },
];

const DEFAULT_OPTS: TranscribeOpts = {
  language: "en-US",
  maxLineLength: 42,
  maxLineDuration: 5,
  punctuation: true,
};

// ─── Format helpers ───────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function toSrtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function toVttTime(s: number): string {
  return toSrtTime(s).replace(",", ".");
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function buildSrt(captions: CaptionEntry[]): string {
  return captions.map((c, i) =>
    `${i + 1}\n${toSrtTime(c.start)} --> ${toSrtTime(c.end)}\n${c.text}`
  ).join("\n\n");
}

function buildVtt(captions: CaptionEntry[]): string {
  const body = captions.map(c =>
    `${toVttTime(c.start)} --> ${toVttTime(c.end)}\n${c.text}`
  ).join("\n\n");
  return `WEBVTT\n\n${body}`;
}

function buildTxt(captions: CaptionEntry[]): string {
  return captions.map(c => `[${fmtTime(c.start)}] ${c.text}`).join("\n");
}

function wrapText(text: string, maxLen: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxLen && cur) {
      lines.push(cur.trim()); cur = w;
    } else { cur = (cur + " " + w).trim(); }
  }
  if (cur) lines.push(cur);
  return lines.join("\n");
}

// ─── Speech Recognition wrapper ──────────────────────────────────────────────

function transcribeAudio(
  audioUrl: string,
  language: string,
  onResult: (entry: CaptionEntry) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): () => void {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
    return () => {};
  }

  const audio = new Audio(audioUrl);
  audio.preload = "auto";

  const recognition = new SpeechRecognition();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let startTime = 0;
  let running = true;
  let lastEnd = 0;

  recognition.onresult = (e: any) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        const text = e.results[i][0].transcript.trim();
        if (!text) continue;
        const now = audio.currentTime;
        const segStart = lastEnd || Math.max(0, now - 3);
        const segEnd = now;
        lastEnd = segEnd;
        onResult({
          id: uid(),
          start: segStart,
          end: segEnd,
          text,
        });
      }
    }
  };

  recognition.onerror = (e: any) => {
    if (e.error === "no-speech" || e.error === "aborted") return;
    onError(`Recognition error: ${e.error}`);
  };

  recognition.onend = () => {
    if (!running) { onDone(); return; }
    // Auto-restart until audio ends
    if (audio.currentTime < audio.duration - 0.5) {
      try { recognition.start(); } catch { /* already started */ }
    } else {
      running = false;
      onDone();
    }
  };

  audio.oncanplay = () => {
    startTime = Date.now();
    audio.play();
    recognition.start();
  };

  audio.onended = () => {
    running = false;
    try { recognition.stop(); } catch { /* ok */ }
    setTimeout(onDone, 500);
  };

  audio.onerror = () => onError("Failed to load audio for transcription.");

  return () => {
    running = false;
    try { recognition.abort(); } catch { /* ok */ }
    audio.pause();
    audio.src = "";
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CaptionGenerator() {
  const [stage, setStage]             = useState<Stage>("idle");
  const [file, setFile]               = useState<File | null>(null);
  const [videoUrl, setVideoUrl]       = useState<string | null>(null);
  const [audioUrl, setAudioUrl]       = useState<string | null>(null);
  const [duration, setDuration]       = useState(0);
  const [captions, setCaptions]       = useState<CaptionEntry[]>([]);
  const [opts, setOpts]               = useState<TranscribeOpts>(DEFAULT_OPTS);
  const [progress, setProgress]       = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError]             = useState("");
  const [dragging, setDragging]       = useState(false);
  const [showOpts, setShowOpts]       = useState(false);
  const [copied, setCopied]           = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [editText, setEditText]       = useState("");
  const [wordCount, setWordCount]     = useState(0);

  const ffmpegRef  = useRef<FFmpeg | null>(null);
  const ffLoaded   = useRef(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const stopRef    = useRef<(() => void) | null>(null);
  const listRef    = useRef<HTMLDivElement>(null);

  const ACCEPT = "video/*,audio/*,.mp4,.webm,.mov,.avi,.mkv,.flv,.wmv,.m4v,.3gp,.ts,.mts,.mp3,.m4a,.wav";

  const setOpt = <K extends keyof TranscribeOpts>(k: K, v: TranscribeOpts[K]) =>
    setOpts(o => ({ ...o, [k]: v }));

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
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
    setStage("ready");
    setCaptions([]);
    setError("");
    setAudioUrl(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }, []);

  // ── Video time tracking ──
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("play", onPlay); v.removeEventListener("pause", onPause); };
  }, [videoUrl]);

  // ── Auto-scroll captions to active ──
  useEffect(() => {
    if (captions.length === 0) return;
    const active = captions.find(c => currentTime >= c.start && currentTime <= c.end);
    if (!active) return;
    const el = document.getElementById(`cap-${active.id}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentTime, captions]);

  // ── Extract audio ──
  const extractAudio = async (f: File): Promise<string> => {
    setProgressMsg("Loading FFmpeg…");
    const ff = await loadFFmpeg();
    const ext = f.name.split(".").pop() ?? "mp4";
    const inName = `input.${ext}`;
    setProgressMsg("Reading file…");
    await ff.writeFile(inName, await fetchFile(f));
    setProgressMsg("Extracting audio…");
    try { await ff.deleteFile("audio.wav"); } catch { /* ok */ }
    // Extract as 16kHz mono WAV — optimal for speech recognition
    const ret = await ff.exec(["-y", "-i", inName, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "audio.wav"]);
    if (ret !== 0) throw new Error("Could not extract audio from this file.");
    const data = await ff.readFile("audio.wav") as Uint8Array;
    try { await ff.deleteFile(inName); await ff.deleteFile("audio.wav"); } catch { /* ok */ }
    const blob = new Blob([data.buffer as ArrayBuffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  };

  // ── Generate captions ──
  const generate = async () => {
    if (!file) return;
    setStage("extracting");
    setProgress(5);
    setCaptions([]);

    try {
      // Check browser support first
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) throw new Error("Speech recognition is not supported in this browser. Please use Chrome or Edge.");

      const aUrl = await extractAudio(file);
      setAudioUrl(aUrl);
      setProgress(30);
      setStage("transcribing");
      setProgressMsg("Listening and transcribing…");

      const collected: CaptionEntry[] = [];

      stopRef.current = transcribeAudio(
        aUrl,
        opts.language,
        (entry) => {
          entry.text = wrapText(entry.text, opts.maxLineLength);
          collected.push(entry);
          setCaptions([...collected]);
          setProgress(Math.min(95, 30 + (collected.length * 3)));
        },
        () => {
          setProgress(100);
          setWordCount(collected.reduce((n, c) => n + c.text.split(/\s+/).length, 0));
          setStage("done");
        },
        (msg) => { setError(msg); setStage("error"); }
      );
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
      setStage("error");
    }
  };

  const stopTranscription = () => {
    stopRef.current?.();
    setStage("done");
  };

  // ── Export ──
  const exportFile = (format: "srt" | "vtt" | "txt") => {
    if (captions.length === 0) return;
    const content = format === "srt" ? buildSrt(captions) : format === "vtt" ? buildVtt(captions) : buildTxt(captions);
    const mime = format === "txt" ? "text/plain" : "text/plain";
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${file?.name.replace(/\.[^.]+$/, "") ?? "captions"}.${format}`;
    a.click();
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(buildTxt(captions));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Caption editing ──
  const startEdit = (c: CaptionEntry) => { setEditId(c.id); setEditText(c.text); };
  const saveEdit = (id: string) => {
    setCaptions(cs => cs.map(c => c.id === id ? { ...c, text: editText } : c));
    setEditId(null);
  };
  const deleteCaption = (id: string) => setCaptions(cs => cs.filter(c => c.id !== id));
  const seekTo = (t: number) => { const v = videoRef.current; if (v) { v.currentTime = t; v.play(); } };

  const reset = () => {
    stopRef.current?.();
    setStage("idle"); setFile(null); setVideoUrl(null); setAudioUrl(null);
    setCaptions([]); setError(""); setProgress(0);
  };

  const activeCap = captions.find(c => currentTime >= c.start && currentTime <= c.end);
  const isAudio = file?.type.startsWith("audio/");

  return (
    <div className="min-h-screen bg-[#07080f] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* ── Header ── */}
        <div className="mb-8">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Tools
          </Link>
          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
              <Captions className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold sm:text-3xl">Caption Generator</h1>
                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400">AI</span>
              </div>
              <p className="mt-1 text-white/50 text-sm">Auto-generate captions from any video or audio. Edit inline. Export SRT, VTT or TXT.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: <ShieldCheck className="h-3 w-3" />, label: "100% Private" },
              { icon: <Globe       className="h-3 w-3" />, label: "No Upload" },
              { icon: <Languages   className="h-3 w-3" />, label: "12 Languages" },
              { icon: <FileText    className="h-3 w-3" />, label: "SRT · VTT · TXT" },
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
              ${dragging ? "border-indigo-400 bg-indigo-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"}`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white">Drop your video or audio here</p>
              <p className="mt-1 text-sm text-white/40">MP4, MOV, AVI, MKV, WebM, MP3, WAV, M4A…</p>
            </div>
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
          </div>
        )}

        {/* ── Workspace ── */}
        {stage !== "idle" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_400px]">

            {/* Left: video + controls */}
            <div className="space-y-4">

              {/* File bar */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                  <FileVideo className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{file?.name}</p>
                  <p className="text-xs text-white/40">{fmtBytes(file?.size ?? 0)} · {fmtTime(duration)}</p>
                </div>
                {stage === "ready" && (
                  <button onClick={reset} className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white/70 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Video preview */}
              {videoUrl && !isAudio && (
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    controls
                    className="w-full max-h-72"
                    onLoadedMetadata={e => setDuration((e.target as HTMLVideoElement).duration)}
                  />
                  {/* Active caption overlay */}
                  {activeCap && stage === "done" && (
                    <div className="bg-black/80 px-4 py-2 text-center text-sm font-semibold text-white whitespace-pre-line">
                      {activeCap.text}
                    </div>
                  )}
                </div>
              )}

              {/* Audio file preview */}
              {videoUrl && isAudio && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15">
                      <Volume2 className="h-6 w-6 text-indigo-400" />
                    </div>
                    <p className="font-medium">{file?.name}</p>
                  </div>
                  <audio src={videoUrl} controls className="w-full"
                    onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)} />
                </div>
              )}

              {/* Options */}
              {(stage === "ready" || stage === "error") && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
                  {/* Language */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">Language</p>
                    <div className="relative">
                      <select
                        value={opts.language}
                        onChange={e => setOpt("language", e.target.value)}
                        className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.code} value={l.code} className="bg-[#0d0d1a]">
                            {l.label} ({l.native})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-white/30" />
                    </div>
                  </div>

                  {/* Advanced toggle */}
                  <button onClick={() => setShowOpts(a => !a)}
                    className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
                    <Settings2 className="h-3.5 w-3.5" />
                    Advanced options
                    <ChevronDown className={`h-3 w-3 transition-transform ${showOpts ? "rotate-180" : ""}`} />
                  </button>

                  {showOpts && (
                    <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="mb-1 text-xs text-white/40">Max line length (chars)</p>
                          <input type="range" min={20} max={80} step={2} value={opts.maxLineLength}
                            onChange={e => setOpt("maxLineLength", +e.target.value)}
                            className="w-full accent-indigo-500" />
                          <p className="text-xs text-indigo-400">{opts.maxLineLength} chars</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-white/40">Max segment duration (s)</p>
                          <input type="range" min={1} max={10} step={0.5} value={opts.maxLineDuration}
                            onChange={e => setOpt("maxLineDuration", +e.target.value)}
                            className="w-full accent-indigo-500" />
                          <p className="text-xs text-indigo-400">{opts.maxLineDuration}s</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {stage === "error" && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  <button onClick={generate}
                    className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 text-sm font-bold text-white transition hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] flex items-center justify-center gap-2">
                    <Mic className="h-4 w-4" />
                    Generate Captions
                  </button>
                </div>
              )}

              {/* Progress */}
              {(stage === "extracting" || stage === "transcribing") && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    <p className="font-semibold text-white">{progressMsg}</p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/30">
                    <span>{progress}% complete · {captions.length} segments captured</span>
                    {stage === "transcribing" && (
                      <button onClick={stopTranscription}
                        className="rounded-lg border border-white/[0.08] px-3 py-1 text-white/50 hover:text-white transition-colors">
                        Stop
                      </button>
                    )}
                  </div>
                  {stage === "transcribing" && captions.length > 0 && (
                    <p className="text-xs text-white/20">Captions are appearing live on the right →</p>
                  )}
                </div>
              )}

              {/* Done stats */}
              {stage === "done" && captions.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Segments", value: captions.length },
                    { label: "Words", value: wordCount },
                    { label: "Duration", value: fmtTime(duration) },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <p className="text-xs text-white/40">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Re-generate button */}
              {stage === "done" && (
                <button onClick={() => setStage("ready")}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <Mic className="h-4 w-4" /> Re-generate captions
                </button>
              )}
            </div>

            {/* Right: captions panel */}
            <div className="flex flex-col gap-3">

              {/* Export bar */}
              {captions.length > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="flex-1 text-xs text-white/40 font-medium">Export as</p>
                  {(["srt", "vtt", "txt"] as const).map(f => (
                    <button key={f} onClick={() => exportFile(f)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase text-white/70 hover:border-indigo-500/40 hover:text-indigo-300 transition-all">
                      <Download className="h-3 w-3" />{f}
                    </button>
                  ))}
                  <button onClick={copyAll}
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-all">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}

              {/* Caption list */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]"
                style={{ maxHeight: "calc(100vh - 280px)", minHeight: 300 }}
              >
                {captions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
                      <Captions className="h-7 w-7 text-indigo-400/50" />
                    </div>
                    <p className="text-sm text-white/30">
                      {stage === "transcribing" ? "Captions will appear here…" : "No captions yet — click Generate"}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 space-y-1.5">
                    {captions.map((cap) => {
                      const isActive = currentTime >= cap.start && currentTime <= cap.end;
                      const isEditing = editId === cap.id;
                      return (
                        <div
                          id={`cap-${cap.id}`}
                          key={cap.id}
                          className={`group rounded-xl border px-3 py-2.5 transition-all cursor-pointer
                            ${isActive
                              ? "border-indigo-500/50 bg-indigo-500/10"
                              : "border-white/[0.04] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"}`}
                          onClick={() => !isEditing && seekTo(cap.start)}
                        >
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/30">
                              {fmtTime(cap.start)}
                            </span>
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <textarea
                                  autoFocus
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  rows={2}
                                  className="w-full resize-none rounded-lg bg-white/[0.06] px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                />
                              ) : (
                                <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">{cap.text}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              {isEditing ? (
                                <button onClick={() => saveEdit(cap.id)} className="rounded p-1 text-emerald-400 hover:bg-white/[0.06]">
                                  <Save className="h-3 w-3" />
                                </button>
                              ) : (
                                <button onClick={() => startEdit(cap)} className="rounded p-1 text-white/30 hover:bg-white/[0.06] hover:text-white/70">
                                  <Edit3 className="h-3 w-3" />
                                </button>
                              )}
                              <button onClick={() => deleteCaption(cap.id)} className="rounded p-1 text-white/30 hover:bg-white/[0.06] hover:text-red-400">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Info cards ── */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: <Mic className="h-5 w-5 text-indigo-400" />,
              title: "Browser Speech AI",
              body: "Uses the Web Speech API built into Chrome and Edge — no server, no upload, instant results.",
            },
            {
              icon: <Edit3 className="h-5 w-5 text-purple-400" />,
              title: "Edit inline",
              body: "Click any caption segment to seek the video. Edit text directly. Delete unwanted segments.",
            },
            {
              icon: <FileText className="h-5 w-5 text-violet-400" />,
              title: "SRT · VTT · TXT",
              body: "Export industry-standard subtitle files ready to upload to YouTube, TikTok, or any platform.",
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

        {/* Browser notice */}
        <div className="mt-6 rounded-2xl border border-amber-500/15 bg-amber-500/5 px-5 py-4 flex items-start gap-3">
          <Zap className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="text-xs text-amber-300/70 leading-relaxed">
            <span className="font-semibold text-amber-300">Best results in Chrome or Edge.</span>{" "}
            The Web Speech API requires microphone permission on your browser — this is used to process the video audio, not to record you.
            For the best accuracy, use clear audio with minimal background noise.
          </p>
        </div>
      </div>
    </div>
  );
}

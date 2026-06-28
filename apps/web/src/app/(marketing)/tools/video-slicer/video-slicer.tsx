"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Scissors, Upload, Download, ArrowLeft, Play, Pause,
  RotateCcw, Loader2, CheckCircle, AlertCircle, FileVideo,
  Zap, Globe, ShieldCheck, Sliders,
} from "lucide-react";

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

const ACCEPTED = "video/*,.mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.m4v,.ts,.3gp,.ogv,.rm,.rmvb";

type Stage = "idle" | "ready" | "processing" | "done" | "error";

// ─── Feature cards ─────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Zap,        title: "Fast Trimming",        desc: "Select start/end with the timeline or type exact timestamps. Cut happens in seconds." },
  { icon: FileVideo,  title: "All Video Formats",    desc: "MP4, MOV, AVI, MKV, WebM, WMV, FLV, M4V, TS, 3GP, OGV and more — all supported." },
  { icon: Globe,      title: "100% In-Browser",      desc: "No upload to any server. Your video never leaves your device." },
  { icon: ShieldCheck,title: "Private & Secure",     desc: "Processing runs locally via WebAssembly. Zero data sent externally." },
  { icon: Sliders,    title: "Precise Control",      desc: "Drag handles on the timeline or enter exact timestamps down to tenths of a second." },
  { icon: Download,   title: "Free Download",        desc: "Download the trimmed clip instantly in the same format as the original." },
];

const STEPS = [
  { n: "01", title: "Choose your video", desc: "Click 'Choose File' or drag & drop any video file. All popular formats are supported — MP4, MOV, AVI, MKV, WebM and more." },
  { n: "02", title: "Set start & end points", desc: "Drag the timeline handles or type exact timestamps to select the portion you want to keep." },
  { n: "03", title: "Cut & Download", desc: "Hit 'Cut Video'. Processing runs in your browser using WebAssembly — no upload, instant result." },
];

// ─── Main component ────────────────────────────────────────────────────────────

export function VideoSlicer() {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [startT, setStartT] = useState(0);
  const [endT, setEndT] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [outputName, setOutputName] = useState("");
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [error, setError] = useState("");

  // ── File load ──
  const loadFile = useCallback((f: File) => {
    setFile(f);
    setStage("ready");
    setOutputUrl("");
    setError("");
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("video/")) loadFile(f);
  };

  // ── Video metadata ──
  const onLoadedMetadata = () => {
    const d = videoRef.current?.duration ?? 0;
    setDuration(d);
    setStartT(0);
    setEndT(d);
  };

  // ── Playback ──
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); } else {
      if (v.currentTime >= endT) v.currentTime = startT;
      v.play();
    }
    setPlaying(!playing);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.currentTime >= endT) { v.pause(); setPlaying(false); }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [endT]);

  // ── Timeline drag ──
  const getTimeFromX = (clientX: number): number => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || duration === 0) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const onTimelineMouseDown = (e: React.MouseEvent, handle: "start" | "end") => {
    e.preventDefault();
    setDragging(handle);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const t = getTimeFromX(e.clientX);
      if (dragging === "start") setStartT(Math.min(t, endT - 0.5));
      else setEndT(Math.max(t, startT + 0.5));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, startT, endT, duration]);

  // ── Timeline click (seek) ──
  const onTimelineClick = (e: React.MouseEvent) => {
    if (dragging) return;
    const t = getTimeFromX(e.clientX);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  // ── Cut video ──
  const cutVideo = async () => {
    if (!file) return;
    setStage("processing");
    setProgress(0);
    setProgressMsg("Loading video processor…");
    setError("");

    try {
      // webpackIgnore: load @ffmpeg/ffmpeg as native ESM from CDN so webpack
      // never processes it. This means its internal import(coreURL) calls are
      // handled by the browser natively and can resolve absolute URLs.
      // Monkey-patch Worker to redirect ffmpeg's internal worker to our
      // self-hosted copy — COEP blocks cross-origin workers but same-origin
      // blob/path workers are fine. We restore the original after construction.
      const OriginalWorker = window.Worker;
      (window as any).Worker = class extends OriginalWorker {
        constructor(url: string | URL, opts?: WorkerOptions) {
          const s = url.toString();
          if (s.includes("ffmpeg") || s.includes("worker")) {
            super(`${window.location.origin}/ffmpeg/worker.js`, { ...opts, type: "module" });
          } else {
            super(url, opts);
          }
        }
      };

      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ffmpeg = new FFmpeg();
      (window as any).Worker = OriginalWorker; // restore immediately after

      const { fetchFile } = await import("@ffmpeg/util");

      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100));
        setProgressMsg(`Processing… ${Math.round(p * 100)}%`);
      });
      ffmpeg.on("log", ({ message }) => {
        if (message.includes("time=")) setProgressMsg(`Cutting… ${message.split("time=")[1]?.split(" ")[0] ?? ""}`);
      });

      setProgressMsg("Loading FFmpeg engine…");
      // Self-hosted in /public/ffmpeg — same origin avoids blob URL + webpack module issues
      const origin = window.location.origin;
      await ffmpeg.load({
        coreURL: `${origin}/ffmpeg/ffmpeg-core.js`,
        wasmURL: `${origin}/ffmpeg/ffmpeg-core.wasm`,
      });

      setProgressMsg("Reading file…");
      const ext = file.name.split(".").pop() ?? "mp4";
      const inName = `input.${ext}`;
      const outName = `output.${ext}`;
      await ffmpeg.writeFile(inName, await fetchFile(file));

      setProgressMsg("Cutting video…");
      await ffmpeg.exec([
        "-i", inName,
        "-ss", startT.toFixed(3),
        "-to", endT.toFixed(3),
        "-c", "copy",
        "-avoid_negative_ts", "make_zero",
        outName,
      ]);

      setProgressMsg("Preparing download…");
      const data = await ffmpeg.readFile(outName);
      const uint8 = data instanceof Uint8Array
        ? new Uint8Array(data.buffer as ArrayBuffer)
        : new TextEncoder().encode(data as string);
      const blob = new Blob([uint8], { type: file.type || "video/mp4" });
      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      setOutputUrl(url);
      setOutputName(`${baseName}_trimmed.${ext}`);
      setStage("done");
      setProgress(100);
      setProgressMsg("Done!");
    } catch (err) {
      console.error("[VideoSlicer]", err);
      const msg = err instanceof Error ? err.message : String(err);
      // Report to New Relic if available (browser agent injected by Next.js layout)
      if (typeof window !== "undefined" && (window as any).newrelic) {
        (window as any).newrelic.noticeError(err instanceof Error ? err : new Error(msg), {
          component: "VideoSlicer",
          fileType: file?.type ?? "unknown",
          fileSize: file?.size ?? 0,
        });
      }
      setError(msg || "Processing failed. Try a different browser.");
      setStage("error");
    }
  };

  const reset = () => {
    setFile(null);
    setVideoUrl("");
    setStage("idle");
    setOutputUrl("");
    setError("");
    setProgress(0);
    setProgressMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Derived ──
  const startPct = duration > 0 ? (startT / duration) * 100 : 0;
  const endPct   = duration > 0 ? (endT   / duration) * 100 : 100;
  const curPct   = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5">
            <Scissors className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Free &bull; No signup &bull; Browser-based</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Video Slicer{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Online</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/50">
            Trim any video to the exact clip you need. Supports every format — MP4, MOV, AVI, MKV, WebM &amp; more. Runs entirely in your browser.
          </p>
        </div>
      </section>

      {/* ── Tool area ── */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        {/* Upload zone */}
        {stage === "idle" && (
          <div
            className="group relative flex cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center transition-all hover:border-emerald-500/40 hover:bg-emerald-500/[0.03]"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 transition-colors group-hover:bg-emerald-500/20">
              <Upload className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Drop your video here</p>
              <p className="mt-1 text-sm text-white/40">or click to browse · MP4, MOV, AVI, MKV, WebM, WMV, FLV &amp; more</p>
            </div>
            <button
              type="button"
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-400"
            >
              Choose File
            </button>
            <p className="text-xs text-white/20">Your video never leaves your device</p>
            <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={onFileChange} />
          </div>
        )}

        {/* Editor */}
        {(stage === "ready" || stage === "done" || stage === "processing") && file && (
          <div className="space-y-4">
            {/* Video preview */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-h-[420px] w-full object-contain"
                onLoadedMetadata={onLoadedMetadata}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>0:00</span>
                <span className="text-white/60 font-mono">{fmt(currentTime)}</span>
                <span>{fmt(duration)}</span>
              </div>

              {/* Track */}
              <div
                ref={timelineRef}
                className="relative h-10 cursor-pointer select-none rounded-lg bg-white/[0.06]"
                onClick={onTimelineClick}
              >
                {/* Selected region */}
                <div
                  className="absolute inset-y-0 rounded-lg bg-emerald-500/25"
                  style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
                />
                {/* Current time indicator */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-white/70 transition-all"
                  style={{ left: `${curPct}%` }}
                />
                {/* Start handle */}
                <div
                  className="absolute inset-y-0 flex cursor-ew-resize items-center justify-center"
                  style={{ left: `${startPct}%`, transform: "translateX(-50%)" }}
                  onMouseDown={(e) => onTimelineMouseDown(e, "start")}
                >
                  <div className="flex h-full w-3 flex-col items-center justify-center rounded-l-md bg-emerald-500 shadow-md">
                    <div className="h-5 w-0.5 rounded-full bg-white/60" />
                  </div>
                </div>
                {/* End handle */}
                <div
                  className="absolute inset-y-0 flex cursor-ew-resize items-center justify-center"
                  style={{ left: `${endPct}%`, transform: "translateX(-50%)" }}
                  onMouseDown={(e) => onTimelineMouseDown(e, "end")}
                >
                  <div className="flex h-full w-3 flex-col items-center justify-center rounded-r-md bg-emerald-500 shadow-md">
                    <div className="h-5 w-0.5 rounded-full bg-white/60" />
                  </div>
                </div>
              </div>

              {/* Time inputs */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Start time", value: fmt(startT), setter: (v: string) => setStartT(Math.max(0, Math.min(parseFmt(v), endT - 0.5))) },
                  { label: "End time",   value: fmt(endT),   setter: (v: string) => setEndT(Math.min(duration, Math.max(parseFmt(v), startT + 0.5))) },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-white/30">{field.label}</label>
                    <input
                      className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                      defaultValue={field.value}
                      key={field.value}
                      onBlur={(e) => field.setter(e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Clip info */}
              <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-4 py-2 text-xs">
                <span className="text-white/40">Selected duration</span>
                <span className="font-semibold text-emerald-400">{fmt(endT - startT)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={togglePlay}
                disabled={stage === "processing"}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.09] disabled:opacity-40"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : "Preview"}
              </button>

              {stage !== "processing" && (
                <button
                  onClick={() => { if (videoRef.current) { videoRef.current.currentTime = startT; setCurrentTime(startT); } }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.09] hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Jump to start
                </button>
              )}

              <div className="ml-auto flex gap-3">
                <button
                  onClick={reset}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
                >
                  Change file
                </button>
                {stage !== "processing" && stage !== "done" && (
                  <button
                    onClick={cutVideo}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-400"
                  >
                    <Scissors className="h-4 w-4" />
                    Cut Video
                  </button>
                )}
              </div>
            </div>

            {/* Processing */}
            {stage === "processing" && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">{progressMsg}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/25">
                  First load downloads the FFmpeg engine (~30 MB). Subsequent cuts are instant.
                </p>
              </div>
            )}

            {/* Done */}
            {stage === "done" && outputUrl && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-400">Your clip is ready!</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      Trimmed {fmt(startT)} → {fmt(endT)} &nbsp;·&nbsp; {fmt(endT - startT)} clip
                    </p>
                  </div>
                  <a
                    href={outputUrl}
                    download={outputName}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-400"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={cutVideo}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors"
                  >
                    Cut again with different times
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white transition-colors"
                  >
                    Start with new file
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <p className="font-semibold text-rose-400">Processing failed</p>
                <p className="mt-1 text-sm text-white/50">{error}</p>
                <p className="mt-2 text-xs text-white/30">
                  Make sure you&apos;re using a modern browser (Chrome/Edge recommended). SharedArrayBuffer must be supported.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setStage("ready"); setError(""); }}
              className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </section>

      {/* ── Features ── */}
      <section className="border-t border-white/[0.06] px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-white sm:text-3xl">
            Why use AutoClipr Video Slicer?
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-colors hover:border-emerald-500/20 hover:bg-white/[0.04]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <f.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="font-semibold text-white">{f.title}</p>
                <p className="mt-2 text-sm text-white/45 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-white/[0.06] px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Scissors className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">How to cut a video online</h2>
              <p className="mt-3 text-sm text-white/40">
                No software to install. No account required. Runs entirely in your browser.
              </p>
            </div>
            <div className="space-y-3">
              {STEPS.map((step, i) => (
                <div
                  key={step.n}
                  className={`rounded-2xl border p-5 transition-colors ${i === 0 ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-white/[0.06] bg-white/[0.02]"}`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`text-xs font-bold tracking-widest ${i === 0 ? "text-emerald-400" : "text-white/25"}`}>
                      STEP {step.n}
                    </span>
                    <div>
                      <p className={`font-semibold ${i === 0 ? "text-white" : "text-white/50"}`}>{step.title}</p>
                      {i === 0 && (
                        <p className="mt-1 text-sm text-white/45 leading-relaxed">{step.desc}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Supported formats ── */}
      <section className="border-t border-white/[0.06] px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-2 text-xl font-bold text-white">Supported Formats</h2>
          <p className="mb-8 text-sm text-white/40">All popular video formats are supported with no conversion needed</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["MP4","MOV","AVI","MKV","WebM","WMV","FLV","M4V","TS","3GP","OGV","RM","RMVB"].map((f) => (
              <span key={f} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/[0.06] px-4 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to cut your video?</h2>
          <p className="mt-3 text-white/45">Free, instant, private. No account required.</p>
          <button
            onClick={() => { reset(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-400"
          >
            <Scissors className="h-4 w-4" />
            Cut Video Now
          </button>
          <div className="mt-6">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 text-sm text-white/35 hover:text-white/60 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all free tools
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

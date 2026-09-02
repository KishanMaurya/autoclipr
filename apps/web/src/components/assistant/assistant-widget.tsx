"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  LifeBuoy,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Plus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AssistantMarkdown } from "@/components/assistant/assistant-markdown";

const API = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1`;

type Action = { label: string; type: "navigate"; target: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: Action[];
  failed?: boolean;
};

/**
 * Faces shown in the header.
 *
 * Placeholders until live human chat is switched on. They are deliberately
 * unlabelled and unnamed — the status line still says "AI assistant", so the
 * cluster reads as decoration rather than a roster of agents standing by.
 * Replace these files with real team photos when that changes.
 *
 * Any file that is missing falls back to an initials circle, so the header is
 * never broken by an absent image.
 */
const SUPPORT_FACES = [
  { src: "/assets/brand/support/1.png", initials: "A" },
  { src: "/assets/brand/support/2.webp", initials: "B" },
  { src: "/assets/brand/support/3.png", initials: "C" },
];


const SUGGESTIONS = [
  "How do I create a clip?",
  "How do credits work?",
  "Why is my video still processing?",
  "How do I upgrade my plan?",
  "How do I download my clips?",
];

/** A nudge tuned to where the user already is, rather than a generic greeting. */
function pageHint(pathname: string): string | null {
  if (pathname.startsWith("/pricing")) return "💳 Questions about plans or a coupon code?";
  if (pathname.startsWith("/billing")) return "🧾 Need help with billing or invoices?";
  if (pathname.startsWith("/dashboard")) return "👋 Need a hand creating your first clip?";
  if (pathname.startsWith("/tools")) return "🛠️ Questions about the free tools?";
  return null;
}

function readableTitle(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return "Home";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function AssistantWidget() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Lets the user return to the suggestions to ask something else without
  // losing the answer they are reading — going back is a view change here,
  // not a reset.
  const [showingWelcome, setShowingWelcome] = useState(false);
  const [rated, setRated] = useState<Record<string, "up" | "down">>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Kept in a ref so Regenerate can replay the last question without it being
  // re-rendered state.
  const lastQuestion = useRef<string>("");

  // ESC closes, matching every other dismissible surface in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Stop an in-flight stream if the widget unmounts mid-answer.
  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || streaming) return;

      lastQuestion.current = text;
      setInput("");
      setStreaming(true);
      setShowingWelcome(false);

      const userMsg: Message = { id: `u${Date.now()}`, role: "user", content: text };
      const replyId = `a${Date.now()}`;

      // History is captured before the new turn is appended, so the question
      // is not sent twice.
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: replyId, role: "assistant", content: "" },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Please sign in to use the assistant.");
        }

        const res = await fetch(`${API}/assistant/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: text,
            history,
            context: { page: pathname, pageTitle: readableTitle(pathname) },
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(
            res.status === 429
              ? "You're asking a lot at once — give it a moment and try again."
              : "Sorry, I'm having trouble responding right now.",
          );
        }

        // SSE arrives in arbitrary chunks, so hold a buffer and only consume
        // complete "data: ...\n\n" frames.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.replace(/^data:\s*/, "").trim();
            if (!line || line === "[DONE]") continue;

            let payload: { delta?: string; done?: boolean; actions?: Action[]; error?: string };
            try {
              payload = JSON.parse(line);
            } catch {
              continue;
            }

            if (payload.error) throw new Error(payload.error);

            if (payload.delta) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === replyId ? { ...m, content: m.content + payload.delta } : m,
                ),
              );
            }
            if (payload.done && payload.actions?.length) {
              setMessages((prev) =>
                prev.map((m) => (m.id === replyId ? { ...m, actions: payload.actions } : m)),
              );
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Sorry, I'm having trouble responding right now.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId ? { ...m, content: message, failed: true } : m,
          ),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, pathname, streaming],
  );

  function regenerate() {
    if (!lastQuestion.current || streaming) return;
    // Drop the previous exchange so the replay does not read as a repeat.
    setMessages((prev) => prev.slice(0, -2));
    void ask(lastQuestion.current);
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard is blocked in some contexts; nothing useful to say */
    }
  }

  const hint = pageHint(pathname);
  const hasConversation = messages.length > 0;
  const empty = !hasConversation || showingWelcome;

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AutoClipr assistant" : "Open AutoClipr assistant"}
        aria-expanded={open}
        className={`fixed bottom-6 right-6 z-[120] h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/40 transition-all duration-200 hover:scale-105 hover:shadow-emerald-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030014] ${
          // On mobile the panel is near full-screen, so the launcher would sit
          // on top of the composer's send button. The header's own close
          // button covers dismissal there; on desktop the panel clears it.
          open ? "hidden scale-95 sm:flex" : "flex"
        }`}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label="AutoClipr assistant"
        className={`fixed z-[119] flex flex-col overflow-hidden border border-white/10 bg-[#0b0a14] shadow-2xl transition-all duration-200 ease-out
          inset-2 rounded-2xl
          sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[640px] sm:max-h-[calc(100vh-8rem)] sm:w-[410px] sm:rounded-3xl
          ${open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-[0.98] opacity-0"}`}
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-white/10 bg-gradient-to-br from-emerald-600 to-teal-700 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              {hasConversation && !showingWelcome && (
                <button
                  type="button"
                  onClick={() => setShowingWelcome(true)}
                  aria-label="Back to suggestions"
                  className="-ml-1 mt-0.5 rounded-full p-1 text-white/80 transition-colors hover:bg-black/15 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-semibold text-white">AutoClipr Assistant</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span className="text-xs text-white/70">AI assistant</span>
              </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2" aria-hidden>
                {SUPPORT_FACES.map((face) => (
                  <Face key={face.src} src={face.src} initials={face.initials} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-black/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {empty ? (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-white">
                  {hasConversation ? "Ask something else" : "Hi there 👋"}
                </p>
                <p className="mt-0.5 text-sm text-white/50">
                  How can I help you with AutoClipr?
                </p>

              </div>

              {hasConversation && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowingWelcome(false)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/15"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to conversation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setShowingWelcome(false);
                      lastQuestion.current = "";
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/15"
                  >
                    <Plus className="h-3 w-3" />
                    New chat
                  </button>
                </div>
              )}

              {hint && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] text-emerald-200">
                  {hint}
                </div>
              )}

              <div className="space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void ask(s)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-left text-[13px] text-white/80 transition-colors hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    {s}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/30" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={m.id}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2 text-[13px] leading-relaxed text-white">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[92%]">
                      <div
                        className={`rounded-2xl rounded-bl-md px-3.5 py-2.5 text-white/80 ${
                          m.failed
                            ? "border border-red-500/25 bg-red-500/10 text-red-200"
                            : "bg-white/[0.05]"
                        }`}
                      >
                        {m.content ? (
                          <AssistantMarkdown content={m.content} />
                        ) : (
                          <Thinking />
                        )}
                      </div>

                      {m.actions?.map((a) => (
                        <button
                          key={a.target}
                          type="button"
                          onClick={() => {
                            router.push(a.target);
                            setOpen(false);
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
                        >
                          {a.label}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ))}

                      {/* Controls only once the answer is complete. */}
                      {m.content && !m.failed && !(streaming && i === messages.length - 1) && (
                        <div className="mt-1.5 flex items-center gap-0.5">
                          <IconBtn
                            label={copiedId === m.id ? "Copied" : "Copy"}
                            onClick={() => void copy(m.id, m.content)}
                          >
                            {copiedId === m.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </IconBtn>
                          <IconBtn
                            label="Helpful"
                            onClick={() => setRated((r) => ({ ...r, [m.id]: "up" }))}
                          >
                            <ThumbsUp
                              className={`h-3.5 w-3.5 ${rated[m.id] === "up" ? "text-emerald-400" : ""}`}
                            />
                          </IconBtn>
                          <IconBtn
                            label="Not helpful"
                            onClick={() => setRated((r) => ({ ...r, [m.id]: "down" }))}
                          >
                            <ThumbsDown
                              className={`h-3.5 w-3.5 ${rated[m.id] === "down" ? "text-red-400" : ""}`}
                            />
                          </IconBtn>
                          <IconBtn label="Regenerate" onClick={regenerate}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      )}

                      {m.failed && (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={regenerate}
                            className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
                          >
                            Try again
                          </button>
                          <Link
                            href="/contact"
                            onClick={() => setOpen(false)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
                          >
                            <LifeBuoy className="h-3 w-3" />
                            Contact support
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-white/10 bg-[#0b0a14] p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask the AutoClipr assistant
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter is a newline, as in every chat app.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
              placeholder="Ask about AutoClipr…"
              maxLength={2000}
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/**
 * One circular avatar that degrades to initials.
 *
 * onError alone is not enough: an image that fails before React hydrates never
 * fires it, leaving a broken-image icon exactly where the fallback belongs. A
 * completed load reporting zero natural width is the reliable signal.
 */
function Face({ src, initials }: { src: string; initials: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setBroken(true);
  }, []);

  if (broken) {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold text-white ring-2 ring-emerald-600">
        {initials}
      </span>
    );
  }

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      onError={() => setBroken(true)}
      // object-top, not centre: these sources are landscape and portrait
      // rather than square, and centring a portrait crop lands on the chest
      // instead of the face.
      className="h-8 w-8 rounded-full object-cover object-top ring-2 ring-emerald-600"
    />
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/70"
    >
      {children}
    </button>
  );
}

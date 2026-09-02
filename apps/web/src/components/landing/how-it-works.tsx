"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Link2, Scissors, Upload } from "lucide-react";
import { Reveal } from "@/components/ui/motion";
import { WorkflowCard } from "./workflow/workflow-card";
import { WorkflowConnector } from "./workflow/workflow-connector";
import { ConnectStep } from "./workflow/connect-step";
import { DetectStep } from "./workflow/detect-step";
import { AiClipStep } from "./workflow/ai-clip-step";
import { PublishStep } from "./workflow/publish-step";
import { useWorkflow, type CardState } from "./workflow/use-workflow";

/**
 * Static description of the pipeline. Copy and palette are unchanged from the
 * previous version — the rebuild is about motion, not a redesign.
 */
const STEPS = [
  {
    id: "connect",
    title: "Connect Channel",
    description:
      "Paste your YouTube channel URL or sign in with Google. AutoClipr starts monitoring instantly.",
    icon: Link2,
    accent: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-500/15 text-violet-400",
    glow: "shadow-violet-500/20",
    Step: ConnectStep,
  },
  {
    id: "detect",
    title: "Detect Uploads",
    description:
      "AutoClipr watches 24/7 and triggers processing the moment a new video goes live — no manual refresh.",
    icon: Bell,
    accent: "from-sky-500 to-blue-600",
    iconBg: "bg-sky-500/15 text-sky-400",
    glow: "shadow-sky-500/20",
    Step: DetectStep,
  },
  {
    id: "clip",
    title: "AI Clips It",
    description:
      "Our model scores every moment for hooks, emotion, and shareability — then renders 9:16 clips with auto-captions.",
    icon: Scissors,
    accent: "from-pink-500 to-rose-600",
    iconBg: "bg-pink-500/15 text-pink-400",
    glow: "shadow-pink-500/20",
    badge: "Core feature",
    Step: AiClipStep,
  },
  {
    id: "publish",
    title: "Auto-Publish",
    description:
      "Clips go live directly on TikTok, Instagram Reels, and YouTube Shorts — all at once, automatically.",
    icon: Upload,
    accent: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-500/15 text-amber-400",
    glow: "shadow-amber-500/20",
    Step: PublishStep,
  },
] as const;

/** Connector tints blend the two cards they join. */
const CONNECTOR_ACCENTS = [
  "from-violet-500 to-sky-500",
  "from-sky-500 to-pink-500",
  "from-pink-500 to-amber-500",
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  // Only run the loop while the section is on screen. This sits well down a
  // long landing page, so without this it would spend most of its life
  // looping to nobody.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const workflow = useWorkflow(visible);

  return (
    <section ref={sectionRef} id="how-it-works" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-14 text-center">
          <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Workflow
          </span>
          <h2 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            From upload to viral in{" "}
            <span className="text-emerald-400">4 steps</span>
          </h2>
          <p className="mt-4 text-lg text-white/45">
            A fully automated pipeline — paste a link and walk away.
          </p>
        </Reveal>

        {/* Column on mobile, row from lg. The connectors flip axis with it. */}
        <div className="flex flex-col items-stretch gap-0 lg:flex-row">
          {STEPS.map((step, i) => {
            const state: CardState = workflow.cardState(i);
            const { Step } = step;

            return (
              <div key={step.id} className="contents">
                <WorkflowCard
                  index={i}
                  state={state}
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                  iconBg={step.iconBg}
                  accent={step.accent}
                  glow={step.glow}
                  badge={"badge" in step ? step.badge : undefined}
                >
                  <Step state={state} />
                </WorkflowCard>

                {i < STEPS.length - 1 && (
                  <WorkflowConnector
                    flowing={workflow.flowingConnector === i}
                    completed={workflow.activeIndex > i}
                    accent={CONNECTOR_ACCENTS[i]}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

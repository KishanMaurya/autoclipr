"use client";

import { useEffect, useRef, useState } from "react";

type MockupVideoProps = {
  /** Path to a muted 9:16 loop under /public, e.g. "/assets/mockups/youtube.mp4". */
  src: string;
  /** Tailwind classes for the placeholder shown before/instead of the video. */
  placeholderClassName?: string;
  className?: string;
};

/**
 * Looping muted clip used as the "screen" of a phone mockup.
 *
 * Self-hosted rather than a YouTube embed: the embedded player re-frames
 * vertical videos inside its own 16:9 box, which cropped the clips
 * unpredictably and showed YouTube's chrome at small sizes. A plain <video>
 * with object-fit: cover gives exact control over the framing.
 *
 * The file is only fetched once the card is near the viewport — this section
 * sits thousands of pixels down the page and there are several mockups.
 * If the file is missing or fails to decode, the gradient placeholder simply
 * stays, so the section degrades cleanly.
 */
export function MockupVideo({
  src,
  placeholderClassName = "bg-gradient-to-b from-zinc-800 to-zinc-950",
  className = "",
}: MockupVideoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect users who have asked for reduced motion — keep the still
    // placeholder instead of an autoplaying loop.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Deliberately a plain scroll + rect check rather than
    // IntersectionObserver or a rAF throttle: both are suspended while a tab
    // is hidden, and the failure mode is the clip silently never appearing.
    let done = false;

    const check = () => {
      if (done) return;
      const rect = el.getBoundingClientRect();
      const margin = 300;
      if (rect.bottom > -margin && rect.top < window.innerHeight + margin) {
        done = true;
        setShouldLoad(true);
        teardown();
      }
    };

    const teardown = () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      document.removeEventListener("visibilitychange", check);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    // Covers loading in a background tab and switching to it without scrolling.
    document.addEventListener("visibilitychange", check);

    return teardown;
  }, []);

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden ${className}`}>
      <div className={`absolute inset-0 ${placeholderClassName}`} />
      {shouldLoad && !failed && (
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          tabIndex={-1}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ pointerEvents: "none" }}
        />
      )}
    </div>
  );
}

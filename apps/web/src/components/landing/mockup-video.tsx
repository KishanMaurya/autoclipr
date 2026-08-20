"use client";

import { useEffect, useRef, useState } from "react";

type MockupVideoProps = {
  /** YouTube video id to loop inside the phone mockup. */
  videoId: string;
  /** Tailwind classes for the placeholder shown before the iframe mounts. */
  placeholderClassName?: string;
  className?: string;
};

/**
 * Looping muted clip used as the "screen" of a phone mockup.
 *
 * The iframe is only mounted once the card is near the viewport. This section
 * sits well below the fold and there are five mockups — eagerly embedding all
 * of them would pull in five YouTube players on first paint for something the
 * visitor may never scroll to.
 */
export function MockupVideo({
  videoId,
  placeholderClassName = "bg-gradient-to-b from-zinc-800 to-zinc-950",
  className = "",
}: MockupVideoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect users who have asked for reduced motion — keep the still
    // placeholder instead of an autoplaying loop.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Deliberately a plain scroll + rect check rather than
    // IntersectionObserver or a rAF throttle: both are suspended while a tab
    // is hidden, and the failure mode is the clip silently never appearing.
    // One getBoundingClientRect per scroll for a handful of mockups is cheap.
    let done = false;

    const check = () => {
      if (done) return;
      const rect = el.getBoundingClientRect();
      const margin = 300;
      if (rect.bottom > -margin && rect.top < window.innerHeight + margin) {
        done = true;
        setVisible(true);
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
      {visible && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&showinfo=0&playsinline=1`}
          title=""
          aria-hidden
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          loading="lazy"
          // credentialless is needed under the COEP policy used elsewhere for
          // these embeds (see hero.tsx).
          // @ts-expect-error not yet in React's iframe typings
          credentialless=""
          // YouTube's player always renders a 16:9 frame, so a vertical Short
          // sits in a centred column of width height*(9/16) with black bars
          // either side. Giving the iframe the container's full height and a
          // 16:9 width makes that column exactly fill a 9:16 container — the
          // bars fall outside and are clipped. Sizing the iframe itself to
          // 9:16 instead shrinks the video to a thin strip, which is what the
          // old scale-[1.35] was trying (and failing) to zoom past.
          className="absolute left-1/2 top-1/2 h-full max-w-none aspect-video -translate-x-1/2 -translate-y-1/2"
          style={{ border: "none", pointerEvents: "none" }}
        />
      )}
    </div>
  );
}

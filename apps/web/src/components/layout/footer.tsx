import Link from "next/link";
import { Twitter, Youtube, Instagram, Linkedin } from "lucide-react";
import { LogoIcon } from "@/components/ui/logo-icon";
import { NewsletterSignup } from "@/components/layout/newsletter-signup";
import { cn } from "@/lib/utils";

// Columns are kept to a similar length so no single one hangs below the rest.
const navColumns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/coaching", label: "Coaching" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/youtube-to-tiktok", label: "YouTube to TikTok" },
      { href: "/youtube-to-shorts", label: "YouTube to Shorts" },
      { href: "/youtube-to-instagram-reels", label: "YouTube to Reels" },
      { href: "/podcast-to-clips", label: "Podcast to Clips" },
    ],
  },
  {
    // Four tools only — the full set of 10 lives on /tools, linked at the end.
    title: "Free Tools",
    links: [
      { href: "/tools/video-slicer", label: "Video Slicer" },
      { href: "/tools/video-compressor", label: "Video Compressor" },
      { href: "/tools/caption-generator", label: "Caption Generator" },
      { href: "/tools/gif-generator", label: "GIF Generator" },
      { href: "/tools", label: "All Free Tools →" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/tutorials", label: "Tutorials" },
      { href: "/faq", label: "FAQ" },
      { href: "/success-stories", label: "Success Stories" },
      { href: "/top-creators", label: "Top Creators" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/feedback", label: "Feedback" },
      { href: "/affiliate", label: "Affiliate Program" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/refund-policy", label: "Refund Policy" },
    ],
  },
];

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-3.5 w-3.5", className)} fill="currentColor" aria-hidden>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  );
}

const socials = [
  { href: "https://x.com/autocliprai", icon: Twitter, label: "X (Twitter)" },
  { href: "https://www.instagram.com/autoclipr.ai/", icon: Instagram, label: "Instagram" },
  { href: "https://youtube.com/@autoclipr", icon: Youtube, label: "YouTube" },
  { href: "https://www.linkedin.com/in/autoclipr-ai/", icon: Linkedin, label: "LinkedIn" },
  { href: "https://www.reddit.com/user/autoClipr/", icon: RedditIcon, label: "Reddit" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06]">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Newsletter — its own row; the nav columns are too narrow for an input */}
        <div className="flex flex-col gap-6 border-b border-white/[0.06] py-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <h3 className="text-base font-bold text-white">
              Get clip tips that actually move views
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Short-form strategy and product updates. No spam.
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <NewsletterSignup />
          </div>
        </div>

        {/* Main grid. From xl the brand block takes two of eight tracks so it
            isn't squeezed against Product. Below that there isn't room for a
            brand column plus six readable nav columns — at lg the brand spans
            its own row and the six nav columns get the full width, which keeps
            labels like "Terms & Conditions" on one line. */}
        <div className="grid gap-x-6 gap-y-12 py-16 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8">
          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-3 lg:col-span-6 xl:col-span-2 xl:pr-6">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <LogoIcon size={36} className="rounded-xl shadow-lg shadow-emerald-900/40" />
              <span className="text-lg font-bold text-white">
                Auto<span className="text-emerald-400">Clipr.ai</span>
              </span>
            </Link>
            {/* Capped at lg, where the brand block spans the full row and the
                text would otherwise stretch edge to edge. */}
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground xl:max-w-none">
              Turn long videos into viral shorts with AI. Monitor channels, detect uploads, auto-clip.
            </p>

            {/* Social icons */}
            <div className="mt-5 flex gap-2">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {navColumns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-emerald-300"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AutoClipr.ai · All rights reserved.
            <span className="sr-only"> Operated by Kishan Kumar Maurya.</span>
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-white transition-colors">Terms</Link>
            <Link href="/contact" className="text-xs text-muted-foreground hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

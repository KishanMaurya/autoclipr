import Link from "next/link";
import { Scissors, Twitter, Github, Youtube } from "lucide-react";

const navColumns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
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
    title: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/feedback", label: "Feedback" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms & Conditions" },
    ],
  },
];

const socials = [
  { href: "https://twitter.com/autoclipr", icon: Twitter, label: "Twitter" },
  { href: "https://youtube.com/@autoclipr", icon: Youtube, label: "YouTube" },
  { href: "https://github.com/autoclipr", icon: Github, label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06]">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Main grid */}
        <div className="grid gap-12 py-16 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-900/40">
                <Scissors className="h-4 w-4 text-white" />
              </span>
              <span className="text-lg font-bold text-white">
                Auto<span className="text-emerald-400">Clipr</span>
                <span className="text-emerald-400">.ai</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
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

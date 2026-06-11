import Link from "next/link";
import { Scissors } from "lucide-react";

const columns = [
  {
    title: "AutoClipr",
    links: [],
    description:
      "Automate your content creation with AI-powered video clipping. Turn long videos into viral shorts in minutes.",
  },
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
    links: [{ href: "mailto:hello@autoclipr.ai", label: "Contact" }],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms & Conditions" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:px-6">
        {columns.map((col) => (
          <div key={col.title}>
            {col.title === "AutoClipr" ? (
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
                  <Scissors className="h-3.5 w-3.5 text-white" />
                </span>
                <h4 className="font-semibold">{col.title}</h4>
              </div>
            ) : (
              <h4 className="mb-4 font-semibold">{col.title}</h4>
            )}
            {col.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{col.description}</p>
            )}
            <ul className="space-y-2.5">
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
      <div className="border-t border-white/[0.06] py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AutoClipr. All rights reserved.
      </div>
    </footer>
  );
}

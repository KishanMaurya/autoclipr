import type { Metadata } from "next";

export const SITE_NAME = "AutoClipr";
export const SITE_TAGLINE = "AI Video Clipping Platform";

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://autoclipr.com";

export const DEFAULT_DESCRIPTION =
  "Turn long YouTube videos and podcasts into viral TikTok, Reels, and Shorts with AI. Auto captions, smart hooks, and one-click export for creators.";

export const DEFAULT_KEYWORDS = [
  "AI video clipping",
  "YouTube to shorts",
  "TikTok clips",
  "Instagram Reels",
  "YouTube Shorts",
  "viral video clips",
  "AI captions",
  "video repurposing",
  "content creator tools",
  "AutoClipr",
];

type PageSeoOptions = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function pageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  keywords = DEFAULT_KEYWORDS,
  noIndex = false,
}: PageSeoOptions): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

export const rootMetadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "48x48" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
};

export const PRIVATE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

import { BLOG_POSTS } from "./blog-posts";
import { LANDING_PAGES } from "./landing-pages";

/** Public marketing routes included in sitemap.xml */
export const SITEMAP_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/feedback", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.85 },
  ...LANDING_PAGES.map((p) => ({
    path: `/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  })),
  ...BLOG_POSTS.map((p) => ({
    path: `/blog/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  })),
  { path: "/login", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/register", changeFrequency: "yearly" as const, priority: 0.5 },
];

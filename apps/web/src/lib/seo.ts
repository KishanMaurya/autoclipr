import type { Metadata } from "next";

export const SITE_NAME = "AutoClipr";
export const SITE_TAGLINE = "AI Video Clipping Platform";

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://autoclipr.com";

export const OG_IMAGE_PATH = "/opengraph-image";
export const OG_IMAGE_ALT = `${SITE_NAME} — Turn long videos into viral shorts with AI`;

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
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [OG_IMAGE_PATH],
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
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/assets/brand/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/assets/brand/logo.png", type: "image/png", sizes: "512x512" }],
    shortcut: ["/favicon.ico"],
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
  { path: "/",                              changeFrequency: "weekly"  as const, priority: 1    },
  { path: "/pricing",                       changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/tools",                         changeFrequency: "weekly"  as const, priority: 0.9  },
  { path: "/tools/format-converter",        changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/tools/video-slicer",            changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/tools/aspect-ratio-converter",  changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/tools/audio-extractor",         changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/tools/caption-generator",       changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/tools/caption-templates",       changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/tools/video-compressor",        changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/tools/thumbnail-extractor",     changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/tools/video-metadata",          changeFrequency: "monthly" as const, priority: 0.75 },
  { path: "/tools/gif-generator",           changeFrequency: "monthly" as const, priority: 0.8  },
  { path: "/blog",                          changeFrequency: "weekly"  as const, priority: 0.85 },
  { path: "/affiliate",                     changeFrequency: "monthly" as const, priority: 0.75 },
  { path: "/changelog",                     changeFrequency: "weekly"  as const, priority: 0.65 },
  { path: "/success-stories",               changeFrequency: "monthly" as const, priority: 0.7  },
  { path: "/top-creators",                  changeFrequency: "weekly"  as const, priority: 0.7  },
  { path: "/faq",                           changeFrequency: "monthly" as const, priority: 0.65 },
  { path: "/contact",                       changeFrequency: "monthly" as const, priority: 0.5  },
  { path: "/feedback",                      changeFrequency: "monthly" as const, priority: 0.5  },
  { path: "/privacy",                       changeFrequency: "yearly"  as const, priority: 0.4  },
  { path: "/terms",                         changeFrequency: "yearly"  as const, priority: 0.4  },
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
];

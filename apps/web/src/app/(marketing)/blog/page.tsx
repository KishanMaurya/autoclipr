import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/blog-index";
import { BlogIndexJsonLd } from "@/components/seo/json-ld";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blog — Video Clipping & Creator Growth",
  description:
    "Tips on repurposing YouTube, TikTok, and podcast content with AI. Guides for Shorts, Reels, captions, and viral clip workflows.",
  path: "/blog",
  keywords: [
    "video clipping blog",
    "YouTube repurposing tips",
    "TikTok creator guides",
    "AI video marketing",
  ],
});

export default function BlogPage() {
  const posts = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <div className="px-4 pb-24 pt-28 sm:px-6">
      <BlogIndexJsonLd posts={posts} />
      <div className="mx-auto max-w-5xl text-center">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <a href="/" className="hover:text-foreground">Home</a>
          <span className="mx-2">/</span>
          <span aria-current="page">Blog</span>
        </nav>
        <p className="section-label mx-auto mb-6">AutoClipr Blog</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Grow with <span className="text-aurora">short-form video</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Guides on repurposing long videos, AI captions, and multi-platform clip workflows.
        </p>
      </div>
      <div className="mx-auto mt-16 max-w-5xl">
        <BlogIndex posts={posts} />
      </div>
    </div>
  );
}

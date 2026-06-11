import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@/lib/blog-posts";

export function BlogArticle({ post }: { post: BlogPost }) {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6">
      <Link
        href="/blog"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to blog
      </Link>

      <header>
        <p className="text-sm text-muted-foreground">
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readMinutes} min read
          </span>
        </p>
        <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
      </header>

      <div className="prose prose-invert mt-12 max-w-none prose-headings:font-semibold prose-p:text-muted-foreground prose-p:leading-relaxed">
        {post.sections.map((section, i) => (
          <section key={i} className="mb-10">
            {section.heading && (
              <h2 className="mb-4 text-2xl text-foreground">{section.heading}</h2>
            )}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="mb-4">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <h2 className="text-2xl font-bold">Try AutoClipr free</h2>
        <p className="mt-2 text-muted-foreground">
          Paste a YouTube link and get viral clips with AI captions in minutes.
        </p>
        <Button variant="gradient" className="mt-6" asChild>
          <Link href="/register">Start free trial</Link>
        </Button>
      </div>
    </article>
  );
}

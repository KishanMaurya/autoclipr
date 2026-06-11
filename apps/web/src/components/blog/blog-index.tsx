import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { BlogPost } from "@/lib/blog-posts";

export function BlogIndex({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
      {posts.map((post) => (
        <Link
          key={post.slug}
          href={`/blog/${post.slug}`}
          className="glass-panel group rounded-2xl p-6 transition-colors hover:border-emerald-500/30"
        >
          <p className="text-xs text-muted-foreground">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            <span className="mx-2">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readMinutes} min read
            </span>
          </p>
          <h2 className="mt-3 text-xl font-semibold group-hover:text-emerald-300">{post.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.description}
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-400">
            Read article
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",          // admin panel — auth-gated, never index
          "/dashboard",
          "/create",
          "/upload",
          "/clips",
          "/channels",
          "/analytics",
          "/settings",
          "/billing",
          "/setup",
          "/login",          // utility auth pages — noindex via metadata too
          "/register",
          "/auth",           // supabase auth callbacks
          "/api",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

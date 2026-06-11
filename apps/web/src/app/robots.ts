import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/blog", "/login", "/register"],
        disallow: [
          "/dashboard",
          "/create",
          "/upload",
          "/clips",
          "/channels",
          "/analytics",
          "/settings",
          "/billing",
          "/setup",
          "/auth",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

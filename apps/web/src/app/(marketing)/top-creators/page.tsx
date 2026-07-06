import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { TopCreatorsList } from "./top-creators-list";

export const metadata: Metadata = pageMetadata({
  title: "Top 100 YouTube Creators by Subscribers — Live Rankings",
  description:
    "Explore live YouTube rankings for the top 100 creators by subscribers, views, and videos. Filter by niche and country. See MrBeast, T-Series, Cocomelon and more.",
  path: "/top-creators",
  keywords: [
    "top youtube creators", "most subscribed youtube channels", "youtube leaderboard",
    "youtube channel rankings", "top 100 youtubers", "biggest youtube channels",
    "youtube stats", "mrbeast subscribers", "creator rankings",
  ],
});

export default function TopCreatorsPage() {
  return <TopCreatorsList />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tutorials — AutoClipr",
  robots: PRIVATE_ROBOTS,
};

export default function TutorialsPage() {
  // Redirect to blog until tutorials are live — 308 Permanent Redirect
  redirect("/blog");
}

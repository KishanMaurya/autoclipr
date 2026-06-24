import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Tutorials — AutoClipr" };

export default function TutorialsPage() {
  notFound();
}

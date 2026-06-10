import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Viral Shorts",
  description: "Paste a video URL or upload a file to generate viral shorts with AI.",
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}

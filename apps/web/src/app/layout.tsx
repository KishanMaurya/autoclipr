import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ApiLoadingProvider } from "@/components/providers/api-loading-provider";
import { rootMetadata } from "@/lib/seo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = rootMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        <ApiLoadingProvider>{children}</ApiLoadingProvider>
        <Analytics />
      </body>
    </html>
  );
}

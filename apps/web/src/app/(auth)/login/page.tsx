import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { LogoIcon } from "@/components/ui/logo-icon";
import { AuthForm } from "@/components/auth/auth-form";
import { PageBackground } from "@/components/ui/page-background";

import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";
export const metadata: Metadata = { title: "Log in — AutoClipr", robots: PRIVATE_ROBOTS };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <PageBackground variant="auth" />
      <Link
        href="/"
        className="absolute left-4 top-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:left-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#3CC252] shadow-glow">
          <LogoIcon size={24} />
        </span>
        <span className="text-xl font-bold">
          AutoClipr<span className="gradient-text">.ai</span>
        </span>
      </div>
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-white/5" />}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}

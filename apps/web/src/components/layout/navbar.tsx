import Link from "next/link";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { resolveUserFullName } from "@/lib/user-avatar";
import { UserMenu } from "./user-menu";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#030014]/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-glow transition-transform group-hover:scale-105">
            <Scissors className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg">
            AutoClipr<span className="gradient-text">.ai</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <UserMenu
              email={user.email}
              phone={user.phone}
              fullName={resolveUserFullName(user.user_metadata)}
              avatarUrl={
                typeof user.user_metadata?.avatar_url === "string"
                  ? user.user_metadata.avatar_url
                  : undefined
              }
            />
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/register">Start free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { resolveUserFullName } from "@/lib/user-avatar";
import { UserMenu } from "./user-menu";
import { FreeToolsDropdown } from "./free-tools-dropdown";
import { ResourcesDropdown } from "./resources-dropdown";
import { MobileMenu } from "./mobile-menu";

const linksLeft = [{ href: "/#features", label: "Features" }];
const linksRight = [
  { href: "/#how-it-works", label: "How it Works" },
  { href: "/coaching", label: "Coaching" },
  { href: "/top-creators", label: "Top Creators" },
  { href: "/pricing", label: "Pricing" },
];

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-[#030014]/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5 font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-brand shadow-glow transition-transform group-hover:scale-105 sm:h-9 sm:w-9">
            <Scissors className="h-4 w-4 text-white" />
          </span>
          <span className="text-base sm:text-lg">
            AutoClipr<span className="gradient-text">.ai</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {linksLeft.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <FreeToolsDropdown />
          {linksRight.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <ResourcesDropdown />
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Mobile: Start free + hamburger */}
          {!user && (
            <Link
              href="/register"
              className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors md:hidden"
            >
              Start free
            </Link>
          )}
          <MobileMenu isLoggedIn={!!user} />

          {/* Desktop: Log in + Start free */}
          {user ? (
            <UserMenu
              email={user.email}
              phone={user.phone}
              fullName={resolveUserFullName(user.user_metadata)}
              avatarUrl={typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined}
            />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button variant="gradient" size="sm" asChild>
                <Link href="/register">Start free</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { LogoIcon } from "@/components/ui/logo-icon";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { resolveUserFullName } from "@/lib/user-avatar";
import { UserMenu } from "./user-menu";
import { FreeToolsDropdown } from "./free-tools-dropdown";
import { ResourcesDropdown } from "./resources-dropdown";
import { MobileMenu } from "./mobile-menu";

const linksLeft = [{ href: "/#features", label: "Features" }];
const linksRight = [
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
    <header className="sticky top-0 z-[100] bg-[#030014]/85 backdrop-blur-2xl">
      {/* Gradient hairline */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group relative flex items-center gap-2.5 font-bold">
          <span className="absolute -inset-2 -z-10 rounded-2xl bg-emerald-500/0 blur-xl transition-colors duration-300 group-hover:bg-emerald-500/15" />
          <LogoIcon size={36} className="rounded-xl shadow-glow transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
          <span className="text-base sm:text-lg">
            Auto<span className="gradient-text">Clipr.ai</span>
          </span>
        </Link>

        {/* Desktop nav — glassy pill */}
        <nav className="hidden items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.03] p-1 shadow-lg shadow-black/20 backdrop-blur-xl md:flex">
          {linksLeft.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground"
            >
              {l.label}
              <span className="absolute inset-x-4 -bottom-px h-px scale-x-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/70 to-emerald-400/0 transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
          <FreeToolsDropdown />
          {linksRight.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground"
            >
              {l.label}
              <span className="absolute inset-x-4 -bottom-px h-px scale-x-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/70 to-emerald-400/0 transition-transform duration-300 group-hover:scale-x-100" />
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

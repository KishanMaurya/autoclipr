"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Link2,
  Share2,
  CreditCard,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { beginNavigationLoading } from "@/lib/api-loading-store";
import {
  markOnboardingComplete,
  DASHBOARD_CHANNEL_PATH,
  DASHBOARD_PLATFORM_PATH,
} from "@/lib/onboarding";
import {
  getUserAvatarFallback,
  getUserAvatarImageUrl,
  getUserDisplayLabel,
  isEmojiAvatar,
} from "@/lib/user-avatar";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

/** Icon chip with a per-item accent color that lights up on row hover. */
function MenuIcon({
  icon: Icon,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <span
      className={cn(
        "mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        "bg-white/[0.04] ring-1 ring-white/[0.06] transition-colors duration-200",
        accent,
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

const itemClass =
  "group cursor-pointer rounded-xl px-2 py-2 text-sm font-medium text-zinc-300 transition-colors focus:bg-white/[0.06] focus:text-white data-[highlighted]:bg-white/[0.06]";

export function UserMenu({
  email,
  phone,
  fullName,
  avatarUrl,
}: UserMenuProps) {
  const router = useRouter();
  const avatarFallback = getUserAvatarFallback({ email, phone, fullName, avatarUrl });
  const avatarImageUrl = getUserAvatarImageUrl(avatarUrl);
  const displayLabel = getUserDisplayLabel({ email, phone, fullName });

  async function signOut() {
    beginNavigationLoading();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function goDashboard() {
    beginNavigationLoading();
    markOnboardingComplete();
    router.push("/dashboard");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative rounded-full outline-none ring-ring transition-transform hover:scale-105 focus-visible:ring-2"
          aria-label="Open account menu"
        >
          {/* Gradient ring around avatar */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 opacity-70 blur-[1.5px] transition-opacity group-hover:opacity-100" />
          <Avatar className="relative h-9 w-9 ring-2 ring-black/50">
            {avatarImageUrl && (
              <AvatarImage src={avatarImageUrl} alt="" referrerPolicy="no-referrer" />
            )}
            <AvatarFallback
              className={cn(
                isEmojiAvatar(avatarFallback) ? "text-lg" : "text-sm font-bold",
              )}
            >
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-72 overflow-hidden rounded-2xl border-white/[0.08] bg-zinc-950/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        {/* Profile header with gradient backdrop */}
        <div className="relative mb-1 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent p-3.5 ring-1 ring-white/[0.06]">
          <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-2 ring-emerald-400/30">
              {avatarImageUrl && (
                <AvatarImage src={avatarImageUrl} alt="" referrerPolicy="no-referrer" />
              )}
              <AvatarFallback
                className={cn(
                  isEmojiAvatar(avatarFallback) ? "text-xl" : "text-base font-bold",
                )}
              >
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              {fullName && (
                <p className="truncate text-sm font-semibold text-white">{fullName}</p>
              )}
              <p className="truncate text-xs text-zinc-400">{displayLabel}</p>
            </div>
          </div>
        </div>

        <DropdownMenuGroup>
          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/" onClick={() => beginNavigationLoading()}>
              <MenuIcon icon={Home} accent="text-zinc-400 group-data-[highlighted]:bg-sky-500/15 group-data-[highlighted]:text-sky-400 group-data-[highlighted]:ring-sky-500/30" />
              Home
              <ChevronRight className="ml-auto h-4 w-4 text-zinc-600 opacity-0 transition-opacity group-data-[highlighted]:opacity-100" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className={itemClass}
            onSelect={(e) => {
              e.preventDefault();
              goDashboard();
            }}
          >
            <MenuIcon icon={LayoutDashboard} accent="text-zinc-400 group-data-[highlighted]:bg-violet-500/15 group-data-[highlighted]:text-violet-400 group-data-[highlighted]:ring-violet-500/30" />
            Dashboard
            <ChevronRight className="ml-auto h-4 w-4 text-zinc-600 opacity-0 transition-opacity group-data-[highlighted]:opacity-100" />
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1.5 bg-white/[0.06]" />

        <DropdownMenuLabel className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Setup
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className={itemClass}>
            <Link href={DASHBOARD_CHANNEL_PATH} onClick={() => beginNavigationLoading()}>
              <MenuIcon icon={Link2} accent="text-zinc-400 group-data-[highlighted]:bg-emerald-500/15 group-data-[highlighted]:text-emerald-400 group-data-[highlighted]:ring-emerald-500/30" />
              Channel Setup
              <ChevronRight className="ml-auto h-4 w-4 text-zinc-600 opacity-0 transition-opacity group-data-[highlighted]:opacity-100" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={itemClass}>
            <Link href={DASHBOARD_PLATFORM_PATH} onClick={() => beginNavigationLoading()}>
              <MenuIcon icon={Share2} accent="text-zinc-400 group-data-[highlighted]:bg-teal-500/15 group-data-[highlighted]:text-teal-400 group-data-[highlighted]:ring-teal-500/30" />
              Platform Connection
              <ChevronRight className="ml-auto h-4 w-4 text-zinc-600 opacity-0 transition-opacity group-data-[highlighted]:opacity-100" />
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1.5 bg-white/[0.06]" />

        <DropdownMenuLabel className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Account
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className={itemClass}>
            <Link href="/billing" onClick={() => beginNavigationLoading()}>
              <MenuIcon icon={CreditCard} accent="text-zinc-400 group-data-[highlighted]:bg-amber-500/15 group-data-[highlighted]:text-amber-400 group-data-[highlighted]:ring-amber-500/30" />
              Manage Membership
              <ChevronRight className="ml-auto h-4 w-4 text-zinc-600 opacity-0 transition-opacity group-data-[highlighted]:opacity-100" />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className={cn(
              itemClass,
              "text-red-400 focus:text-red-300 data-[highlighted]:bg-red-500/10",
            )}
            onSelect={(e) => {
              e.preventDefault();
              signOut();
            }}
          >
            <MenuIcon icon={LogOut} accent="text-red-400/80 group-data-[highlighted]:bg-red-500/15 group-data-[highlighted]:text-red-400 group-data-[highlighted]:ring-red-500/30" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
          className="rounded-full outline-none ring-ring transition-transform hover:scale-105 focus-visible:ring-2"
          aria-label="Open account menu"
        >
          <Avatar className="h-9 w-9 ring-2 ring-white/10">
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

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2.5">
          <p className="truncate text-sm text-muted-foreground">{displayLabel}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/" onClick={() => beginNavigationLoading()} className="cursor-pointer">
              <Home className="mr-2.5 h-4 w-4 text-muted-foreground" />
              Home
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              goDashboard();
            }}
          >
            <LayoutDashboard className="mr-2.5 h-4 w-4 text-muted-foreground" />
            Dashboard
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Setup</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href={DASHBOARD_CHANNEL_PATH}
              onClick={() => beginNavigationLoading()}
              className="cursor-pointer"
            >
              <Link2 className="mr-2.5 h-4 w-4 text-muted-foreground" />
              Channel Setup
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={DASHBOARD_PLATFORM_PATH}
              onClick={() => beginNavigationLoading()}
              className="cursor-pointer"
            >
              <Share2 className="mr-2.5 h-4 w-4 text-muted-foreground" />
              Platform Connection
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/billing" onClick={() => beginNavigationLoading()} className="cursor-pointer">
              <CreditCard className="mr-2.5 h-4 w-4 text-muted-foreground" />
              Manage Membership
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-red-400 focus:text-red-400"
            onSelect={(e) => {
              e.preventDefault();
              signOut();
            }}
          >
            <LogOut className="mr-2.5 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

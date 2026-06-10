import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/upload", "/create", "/clips", "/billing", "/settings", "/setup"];

const ONBOARDING_COOKIE = "autoclipr_onboarding_complete";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/register") &&
    user
  ) {
    const onboardingDone =
      request.cookies.get(ONBOARDING_COOKIE)?.value === "1";
    const dest = onboardingDone ? "/dashboard" : "/setup/platforms";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  const onboardingDone =
    request.cookies.get(ONBOARDING_COOKIE)?.value === "1";
  const isDashboardArea = ["/dashboard", "/upload", "/create", "/clips", "/billing", "/settings"].some(
    (p) => request.nextUrl.pathname.startsWith(p)
  );
  if (user && isDashboardArea && !onboardingDone) {
    return NextResponse.redirect(new URL("/setup/platforms", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

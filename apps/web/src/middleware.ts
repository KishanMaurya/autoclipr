import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/analytics",
  "/upload",
  "/create",
  "/clips",
  "/billing",
  "/dashboard/affiliate",
  "/settings",
  "/setup",
];

const ONBOARDING_COOKIE = "autoclipr_onboarding_complete";
const REF_COOKIE = "autoclipr_ref";

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
  const isDashboardArea = [
    "/dashboard",
    "/analytics",
    "/upload",
    "/create",
    "/clips",
    "/billing",
    "/dashboard/affiliate",
    "/settings",
  ].some((p) => request.nextUrl.pathname.startsWith(p));
  if (user && isDashboardArea && !onboardingDone) {
    return NextResponse.redirect(new URL("/setup/platforms", request.url));
  }

  // Capture affiliate ref code from ?ref= param — store as 90-day cookie
  const refParam = request.nextUrl.searchParams.get("ref");
  if (refParam && /^[a-z0-9_-]{4,32}$/i.test(refParam)) {
    const existing = request.cookies.get(REF_COOKIE)?.value;
    if (!existing) {
      supabaseResponse.cookies.set(REF_COOKIE, refParam, {
        path: "/",
        maxAge: 60 * 60 * 24 * 90, // 90 days
        sameSite: "lax",
        httpOnly: false, // readable by JS so the signup form can send it to the API
      });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

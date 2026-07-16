import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const appRoutes = [
  "/checkin",
  "/dashboard",
  "/log",
  "/menu",
  "/profile",
  "/recipes",
  "/squad",
  "/stats",
  "/workouts",
];

const authRoutes = ["/login", "/signup"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Skip if Supabase is not configured
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and supabase.auth.getClaims().
  // A simple mistake could make it very hard to debug issues with users
  // randomly being logged out.
  //
  // IMPORTANT: supabase.auth.getClaims() is the recommended way to
  // protect pages. See the "Core Principles" in the Supabase docs.
  const { data, error } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub && !error);

  if (!isSignedIn && (matchesRoute(pathname, appRoutes) || pathname === "/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isSignedIn && matchesRoute(pathname, authRoutes)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = isSignedIn ? "/dashboard" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

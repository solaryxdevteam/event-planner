/**
 * Next.js Middleware
 * Handles authentication and authorization for protected routes
 * Runs before the request reaches your pages
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/callback",
    "/api/auth/callback", // Supabase auth callback endpoint
    "/auth/error",
    "/auth/register",
    "/auth/verify-email", // Email OTP verification after registration
    "/auth/pending",
    "/auth/onboarding",
    "/verify-venue", // Venue contact verification (link from email, no auth required)
    "/verify-dj", // DJ contact verification (link from email, no auth required)
  ];

  const { pathname } = request.nextUrl;

  // Special-case the root path so that "/" being public doesn't make every route public
  const isPublicRoute =
    pathname === "/" || publicRoutes.filter((route) => route !== "/").some((route) => pathname.startsWith(route));

  // API routes handle their own authentication, but we still refresh the session above
  // This allows API routes to use requireAuth() which will throw if not authenticated
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // Only fetch user status when needed for redirect decisions (no cookie caching)
  // We only need status for redirects, not for regular navigation
  let userStatus: string | null = null;
  const needsStatusCheck =
    user &&
    !isApiRoute &&
    (pathname === "/" ||
      pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/register") ||
      pathname.startsWith("/dashboard"));

  if (needsStatusCheck) {
    const { data: dbUser } = await supabase.from("users").select("status").eq("id", user.id).single();
    userStatus = dbUser?.status || null;
  }

  // Handle root path redirect based on authentication status
  if (pathname === "/" && !isApiRoute) {
    if (user) {
      // Authenticated users go to dashboard or profile if pending
      if (userStatus === "pending") {
        return NextResponse.redirect(new URL("/dashboard/profile", request.url));
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Unauthenticated users go to login
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect authenticated users from login/register pages
  // (but not for API routes - they handle their own responses)
  if (
    user &&
    !isApiRoute &&
    (request.nextUrl.pathname.startsWith("/auth/login") || request.nextUrl.pathname.startsWith("/auth/register"))
  ) {
    // If pending, redirect to profile page, otherwise dashboard
    if (userStatus === "pending") {
      return NextResponse.redirect(new URL("/dashboard/profile", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect pending users from dashboard routes (except profile) to profile
  if (user && userStatus === "pending" && !isApiRoute && request.nextUrl.pathname.startsWith("/dashboard")) {
    // Allow access to profile page
    if (
      request.nextUrl.pathname === "/dashboard/profile" ||
      request.nextUrl.pathname.startsWith("/dashboard/profile/")
    ) {
      return response;
    }
    // Redirect all other dashboard routes to profile
    return NextResponse.redirect(new URL("/dashboard/profile", request.url));
  }

  // Redirect to login if trying to access protected route while not authenticated
  // (but not for API routes - they handle their own auth and return JSON errors)
  if (!user && !isPublicRoute && !isApiRoute) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect_to", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

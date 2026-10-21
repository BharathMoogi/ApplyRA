import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Skip middleware overhead entirely for Server Actions, API routes, and non-GET requests
  if (
    request.method !== "GET" ||
    request.headers.get("next-action") ||
    request.nextUrl.pathname.startsWith("/api")
  ) {
    return supabaseResponse;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isPlaceholder = !url || !url.startsWith("http") || url.includes("placeholder");

  // If Supabase is unconfigured or in placeholder mode, pass through immediately
  if (isPlaceholder) {
    return supabaseResponse;
  }

  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  try {
    const supabase = createServerClient(url, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Run session check with an aggressive 1.2s timeout so Edge Middleware NEVER causes a 504
    const userPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 1200)
    );

    const {
      data: { user },
    } = await Promise.race([userPromise, timeoutPromise]);

    const protectedRoutes = ["/dashboard", "/applications", "/profile", "/settings"];
    const isProtected = protectedRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    );

    if (!user && isProtected) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
  } catch (err) {
    // If Supabase network call fails in Edge middleware, pass through so server layout can handle it
    console.warn("[Middleware] Supabase auth check skipped:", err);
  }

  return supabaseResponse;
}

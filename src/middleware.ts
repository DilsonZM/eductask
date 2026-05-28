import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectWithCookies(
  url: string | URL,
  supabaseResponse: NextResponse
) {
  const response = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, cacheHeaders) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          if (cacheHeaders) {
            Object.entries(cacheHeaders).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, value);
            });
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isPublicPage = request.nextUrl.pathname === "/";
  const isAdminPage = request.nextUrl.pathname.startsWith("/admin");
  const isTeacherPage = request.nextUrl.pathname.startsWith("/teacher");
  const isStudentPage = request.nextUrl.pathname.startsWith("/student");

  if (!user && !isAuthPage && !isPublicPage) {
    return redirectWithCookies(new URL("/login", request.url), supabaseResponse);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "student";

    if (isAuthPage) {
      if (role === "admin") {
        return redirectWithCookies(new URL("/admin/dashboard", request.url), supabaseResponse);
      } else if (role === "teacher") {
        return redirectWithCookies(new URL("/teacher/dashboard", request.url), supabaseResponse);
      } else {
        return redirectWithCookies(new URL("/student/dashboard", request.url), supabaseResponse);
      }
    }

    if (isAdminPage && role !== "admin") {
      return redirectWithCookies(new URL(`/${role}/dashboard`, request.url), supabaseResponse);
    }

    if (isTeacherPage && role !== "teacher") {
      return redirectWithCookies(new URL(`/${role}/dashboard`, request.url), supabaseResponse);
    }

    if (isStudentPage && role !== "student") {
      return redirectWithCookies(new URL(`/${role}/dashboard`, request.url), supabaseResponse);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
import { NextResponse } from "next/server";

const ASSIGNMENT_MODE = process.env.NEXT_PUBLIC_ASSIGNMENT_MODE !== "false";

function isProtectedPath(pathname) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/availability" ||
    pathname.startsWith("/availability/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/bookings" ||
    pathname.startsWith("/bookings/")
  );
}

export function proxy(request) {
  if (ASSIGNMENT_MODE) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("calclone_auth")?.value;
  if (authCookie) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/signup";
  redirectUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/availability/:path*",
    "/bookings/:path*",
    "/onboarding/:path*",
  ],
};

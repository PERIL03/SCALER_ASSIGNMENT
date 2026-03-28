import { NextResponse } from "next/server";

export function proxy(request) {
  // Auth cookie is hosted on backend domain, so frontend middleware cannot
  // reliably read it. Route protection happens in client/server API checks.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/availability/:path*",
    "/bookings/:path*",
    "/onboarding/:path*",
    "/book/:path*",
    "/booking-confirmation/:path*",
  ],
};

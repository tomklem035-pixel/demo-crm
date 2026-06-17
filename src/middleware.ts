import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    if (
      req.nextUrl.pathname.startsWith("/api/") &&
      !req.nextauth.token
    ) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|api/health|login|_next/static|_next/image|favicon\\.ico|(?:.*\\..*)).*)",
  ],
};

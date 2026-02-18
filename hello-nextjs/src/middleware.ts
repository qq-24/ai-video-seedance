import { type NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

interface SessionData {
  isLoggedIn: boolean;
}

const SESSION_SECRET = process.env.SESSION_SECRET || "super-secret-key-change-in-production-at-least-32-chars";
const SESSION_NAME = "video-gen-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  const session = await getIronSession<SessionData>(request, response, {
    password: SESSION_SECRET,
    cookieName: SESSION_NAME,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
    },
  });

  const isLoggedIn = session.isLoggedIn === true;

  const protectedRoutes = ["/projects", "/create"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const authRoutes = ["/login", "/register"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !isLoggedIn) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mp3|wav)$).*)",
  ],
};

import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { AUTH_CONFIG } from "@/lib/auth";

interface SessionData {
  isLoggedIn: boolean;
}

export async function POST(request: Request) {
  try {
    const response = NextResponse.json({ success: true });
    
    const session = await getIronSession<SessionData>(request, response, {
      password: AUTH_CONFIG.sessionSecret,
      cookieName: AUTH_CONFIG.sessionName,
      cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        maxAge: AUTH_CONFIG.cookieMaxAge,
        httpOnly: true,
        sameSite: "lax",
      },
    });

    session.destroy();

    return response;
  } catch (error) {
    console.error("[Logout API] Error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}

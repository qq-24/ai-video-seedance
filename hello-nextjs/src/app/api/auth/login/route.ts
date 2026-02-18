import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { AUTH_CONFIG, isValidPassword } from "@/lib/auth";

interface SessionData {
  isLoggedIn: boolean;
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

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

    session.isLoggedIn = true;
    await session.save();

    return response;
  } catch (error) {
    console.error("[Login API] Error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

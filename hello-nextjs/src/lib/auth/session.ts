import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { AUTH_CONFIG } from "./config";

interface SessionData {
  isLoggedIn: boolean;
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    password: AUTH_CONFIG.sessionSecret,
    cookieName: AUTH_CONFIG.sessionName,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH_CONFIG.cookieMaxAge,
      httpOnly: true,
      sameSite: "lax",
    },
  });
}

export async function isLoggedIn(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true;
}

export async function login(): Promise<void> {
  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/auth";

export async function withAuth<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handler();
}

export function authResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

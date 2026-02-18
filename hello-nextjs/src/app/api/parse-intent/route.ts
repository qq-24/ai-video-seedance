/**
 * Intent parsing API route.
 * POST /api/parse-intent - Parse user's natural language input to identify intent
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { parseIntent, isZhipuConfigured, ZhipuApiError } from "@/lib/ai/zhipu";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isZhipuConfigured()) {
      return NextResponse.json(
        { error: "AI service is not configured. Please set ZHIPU_API_KEY." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { error: "Input is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    console.log("[parse-intent] Parsing intent for input:", input.substring(0, 100));

    const intent = await parseIntent(input.trim());

    console.log("[parse-intent] Parsed intent:", JSON.stringify(intent));

    return NextResponse.json({
      success: true,
      intent,
    });
  } catch (error) {
    console.error("[parse-intent] Error parsing intent:", error);

    if (error instanceof ZhipuApiError) {
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to parse intent" },
      { status: 500 }
    );
  }
}

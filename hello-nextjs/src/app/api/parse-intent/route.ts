/**
 * Intent parsing API route.
 * POST /api/parse-intent - Parse user's natural language input to identify intent
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseIntent, isGeminiConfigured, GeminiApiError } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "AI service is not configured. Please set GEMINI_API_KEY." },
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

    if (error instanceof GeminiApiError) {
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

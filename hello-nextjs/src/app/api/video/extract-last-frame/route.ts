/**
 * API Route: Extract Last Frame from Video
 * POST /api/video/extract-last-frame
 *
 * Request Body:
 *   - videoId?: string  - Database video ID (will fetch URL from DB)
 *   - videoUrl?: string - Direct video URL
 *   - uploadToStorage?: boolean - Whether to upload extracted frame to storage
 *   - userId?: string - Required if uploadToStorage is true
 *   - sceneId?: string - Required if uploadToStorage is true
 *
 * Response:
 *   - success: boolean
 *   - frameBase64?: string - Base64 encoded PNG image
 *   - frameUrl?: string - Storage URL if uploaded
 *   - needsClientExtraction?: boolean - True if server cannot extract
 *   - error?: string - Error message
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractLastFrame,
  isFfmpegAvailable,
  type ExtractedFrame,
} from "@/lib/video/frame-extractor";
import { getVideoById } from "@/lib/db/media";

interface ExtractRequest {
  videoId?: string;
  videoUrl?: string;
  uploadToStorage?: boolean;
  userId?: string;
  sceneId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractedFrame>> {
  console.log("[API] POST /api/video/extract-last-frame - Starting");

  try {
    const body: ExtractRequest = await request.json();
    console.log("[API] Request body:", JSON.stringify(body));

    const { videoId, videoUrl, uploadToStorage, userId, sceneId } = body;

    let targetVideoUrl: string | undefined;

    if (videoId) {
      console.log("[API] Fetching video by ID:", videoId);
      try {
        const video = await getVideoById(videoId);
        targetVideoUrl = video.url;
        console.log("[API] Found video URL from database");
      } catch (dbError) {
        console.error("[API] Failed to fetch video from database:", dbError);
        return NextResponse.json(
          {
            success: false,
            error: `Video not found: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
          },
          { status: 404 }
        );
      }
    } else if (videoUrl) {
      targetVideoUrl = videoUrl;
      console.log("[API] Using provided video URL");
    } else {
      console.log("[API] No video ID or URL provided");
      return NextResponse.json(
        {
          success: false,
          error: "Either videoId or videoUrl is required",
        },
        { status: 400 }
      );
    }

    if (!targetVideoUrl) {
      console.log("[API] Video URL is empty");
      return NextResponse.json(
        {
          success: false,
          error: "Video URL is empty",
        },
        { status: 400 }
      );
    }

    if (uploadToStorage) {
      if (!userId || !sceneId) {
        console.log("[API] Missing userId or sceneId for storage upload");
        return NextResponse.json(
          {
            success: false,
            error: "userId and sceneId are required when uploadToStorage is true",
          },
          { status: 400 }
        );
      }
    }

    console.log("[API] Extracting last frame...");
    console.log("[API] ffmpeg available:", isFfmpegAvailable());

    const result = await extractLastFrame(targetVideoUrl, {
      uploadToStorage,
      userId,
      sceneId,
    });

    console.log("[API] Extraction result:", {
      success: result.success,
      needsClientExtraction: result.needsClientExtraction,
      hasFrameBase64: !!result.frameBase64,
      hasFrameUrl: !!result.frameUrl,
      error: result.error,
    });

    const statusCode = result.success ? 200 : result.needsClientExtraction ? 200 : 500;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error("[API] Unexpected error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${errorMsg}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  console.log("[API] GET /api/video/extract-last-frame - Checking ffmpeg status");

  return NextResponse.json({
    ffmpegAvailable: isFfmpegAvailable(),
    message: isFfmpegAvailable()
      ? "ffmpeg is available on the server. Server-side extraction is supported."
      : "ffmpeg is NOT available. Client-side extraction will be required.",
  });
}

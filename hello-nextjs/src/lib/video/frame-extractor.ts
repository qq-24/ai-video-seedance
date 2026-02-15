/**
 * Video Frame Extractor
 * Extracts the last frame from a video file.
 * Uses ffmpeg if available, otherwise returns a flag for client-side extraction.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

const FFMPEG_TIMEOUT_MS = 30000;

let ffmpegAvailable: boolean | null = null;

export interface ExtractedFrame {
  success: boolean;
  frameBase64?: string;
  frameUrl?: string;
  needsClientExtraction?: boolean;
  error?: string;
}

export interface ExtractOptions {
  uploadToStorage?: boolean;
  userId?: string;
  sceneId?: string;
}

class FrameExtractorError extends Error {
  constructor(
    message: string,
    public code: "ffmpeg_not_found" | "download_failed" | "extraction_failed" | "upload_failed"
  ) {
    super(message);
    this.name = "FrameExtractorError";
  }
}

async function checkFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) {
    return ffmpegAvailable;
  }

  try {
    console.log("[FrameExtractor] Checking ffmpeg availability...");
    const { stdout, stderr } = await execAsync("ffmpeg -version", {
      timeout: 5000,
    });
    ffmpegAvailable = true;
    console.log("[FrameExtractor] ffmpeg is available");
    console.log("[FrameExtractor] ffmpeg version output:", stdout.split("\n")[0]);
    return true;
  } catch (error) {
    ffmpegAvailable = false;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log("[FrameExtractor] ffmpeg is NOT available:", errorMsg);
    return false;
  }
}

export function isFfmpegAvailable(): boolean {
  return ffmpegAvailable === true;
}

async function downloadVideoToTemp(videoUrl: string): Promise<string> {
  console.log("[FrameExtractor] Downloading video from:", videoUrl);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new FrameExtractorError(
      `Failed to download video: HTTP ${response.status}`,
      "download_failed"
    );
  }

  const contentType = response.headers.get("content-type") || "video/mp4";
  const extension = contentType.includes("mp4") ? ".mp4" : ".webm";
  const tempPath = join(tmpdir(), `video_${Date.now()}${extension}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(tempPath, buffer);

  console.log("[FrameExtractor] Video downloaded to:", tempPath);
  return tempPath;
}

async function extractLastFrameWithFfmpeg(videoPath: string): Promise<Buffer> {
  const outputPath = join(tmpdir(), `frame_${Date.now()}.png`);

  console.log("[FrameExtractor] Extracting last frame from:", videoPath);

  try {
    const { stdout, stderr } = await execAsync(
      `ffmpeg -y -sseof -0.1 -i "${videoPath}" -frames:v 1 -q:v 2 "${outputPath}"`,
      {
        timeout: FFMPEG_TIMEOUT_MS,
      }
    );

    if (stderr && !stderr.includes("frame=")) {
      console.log("[FrameExtractor] ffmpeg stderr:", stderr);
    }

    const frameBuffer = await readFile(outputPath);

    if (frameBuffer.length === 0) {
      throw new FrameExtractorError("Extracted frame is empty", "extraction_failed");
    }

    console.log("[FrameExtractor] Frame extracted successfully, size:", frameBuffer.length, "bytes");

    await unlink(outputPath).catch((err) => {
      console.warn("[FrameExtractor] Failed to cleanup temp frame file:", err.message);
    });

    return frameBuffer;
  } catch (error) {
    await unlink(outputPath).catch(() => {});

    if (error instanceof FrameExtractorError) {
      throw error;
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[FrameExtractor] ffmpeg extraction failed:", errorMsg);
    throw new FrameExtractorError(`ffmpeg extraction failed: ${errorMsg}`, "extraction_failed");
  }
}

async function uploadFrameToStorage(
  frameBuffer: Buffer,
  userId: string,
  sceneId: string
): Promise<string> {
  const { uploadFile } = await import("@/lib/db/media");

  const fileName = `last_frame_${sceneId}_${Date.now()}.png`;

  console.log("[FrameExtractor] Uploading frame to storage:", fileName);

  const { url } = await uploadFile(userId, sceneId, fileName, frameBuffer, {
    contentType: "image/png",
  });

  console.log("[FrameExtractor] Frame uploaded, URL:", url);
  return url;
}

export async function extractLastFrame(
  videoUrl: string,
  options: ExtractOptions = {}
): Promise<ExtractedFrame> {
  console.log("[FrameExtractor] Starting extraction for:", videoUrl);
  console.log("[FrameExtractor] Options:", JSON.stringify(options));

  if (!videoUrl) {
    return {
      success: false,
      error: "Video URL is required",
    };
  }

  const ffmpegReady = await checkFfmpegAvailable();

  if (!ffmpegReady) {
    console.log("[FrameExtractor] ffmpeg not available, returning needsClientExtraction: true");
    return {
      success: false,
      needsClientExtraction: true,
      error: "ffmpeg is not available on the server. Client-side extraction required.",
    };
  }

  let tempVideoPath: string | null = null;

  try {
    tempVideoPath = await downloadVideoToTemp(videoUrl);

    const frameBuffer = await extractLastFrameWithFfmpeg(tempVideoPath);

    const frameBase64 = frameBuffer.toString("base64");

    if (options.uploadToStorage && options.userId && options.sceneId) {
      try {
        const frameUrl = await uploadFrameToStorage(
          frameBuffer,
          options.userId,
          options.sceneId
        );

        return {
          success: true,
          frameBase64,
          frameUrl,
        };
      } catch (uploadError) {
        console.error("[FrameExtractor] Upload failed:", uploadError);
        return {
          success: true,
          frameBase64,
          error: "Frame extracted but upload failed",
        };
      }
    }

    return {
      success: true,
      frameBase64,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[FrameExtractor] Extraction failed:", errorMsg);

    if (
      error instanceof FrameExtractorError &&
      error.code === "extraction_failed"
    ) {
      return {
        success: false,
        needsClientExtraction: true,
        error: errorMsg,
      };
    }

    return {
      success: false,
      error: errorMsg,
    };
  } finally {
    if (tempVideoPath) {
      await unlink(tempVideoPath).catch((err) => {
        console.warn("[FrameExtractor] Failed to cleanup temp video file:", err.message);
      });
    }
  }
}

export function getClientExtractionInstructions(): string {
  return `
Client-side video last frame extraction approach:

1. Using HTMLVideoElement + Canvas approach:
   - Create a hidden video element to load the video
   - Listen for the loadedmetadata event to get the video duration
   - Set currentTime to near the end of the video (duration - 0.1 seconds)
   - After the seeked event fires, use canvas.drawImage() to draw the current frame
   - Use canvas.toDataURL() or canvas.toBlob() to get the image data

2. Example code:
   async function extractLastFrameClient(videoUrl: string): Promise<string> {
     return new Promise((resolve, reject) => {
       const video = document.createElement('video');
       video.crossOrigin = 'anonymous';
       video.src = videoUrl;
       video.muted = true;

       video.onloadedmetadata = () => {
         video.currentTime = Math.max(0, video.duration - 0.1);
       };

       video.onseeked = () => {
         const canvas = document.createElement('canvas');
         canvas.width = video.videoWidth;
         canvas.height = video.videoHeight;
         const ctx = canvas.getContext('2d');
         ctx.drawImage(video, 0, 0);
         resolve(canvas.toDataURL('image/png'));
       };

       video.onerror = () => reject(new Error('Failed to load video'));
     });
   }

3. Notes:
   - The video must support CORS (crossOrigin = 'anonymous')
   - Some video formats may require codec support
   - Mobile browsers may have compatibility issues
`;
}

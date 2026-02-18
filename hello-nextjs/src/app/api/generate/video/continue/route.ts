/**
 * Continue video generation API.
 * POST /api/generate/video/continue - Create a continuation video task using the last frame of a parent video
 *
 * This API enables video chain generation by using the last frame of an existing video
 * as the first frame of a new video generation task.
 */

import { NextResponse } from "next/server";
import { getSceneById, updateSceneVideoStatus } from "@/lib/db/scenes";
import { getProjectById, isProjectOwner } from "@/lib/db/projects";
import {
  getVideoById,
  createProcessingVideo,
  getSignedUrl,
  getLatestImageBySceneId,
} from "@/lib/db/media";
import {
  createVideoTask,
  isVolcVideoConfigured,
  VolcVideoApiError,
} from "@/lib/ai/volc-video";
import {
  appendVideoToChain,
  getVideoChainByVideoId,
  createVideoChain,
} from "@/lib/db/video-chains";
import { getLatestMaterialBySceneId } from "@/lib/db/materials";
import { getSession } from "@/lib/auth/session";

interface ContinueVideoRequest {
  sceneId: string;
  parentVideoId: string;
  description: string;
  lastFrameUrl?: string;
}

interface ContinueVideoResponse {
  success: boolean;
  taskId: string;
  videoId: string;
  chainItemId: string;
  message?: string;
}

export async function POST(request: Request): Promise<NextResponse<ContinueVideoResponse | { error: string }>> {
  const logPrefix = "[ContinueVideo]";
  console.log(`${logPrefix} Starting continue video generation`);

  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      console.warn(`${logPrefix} Unauthorized access attempt`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isVolcVideoConfigured()) {
      console.error(`${logPrefix} Volc Video API not configured`);
      return NextResponse.json(
        { error: "Video generation service is not configured. Please set VOLC_API_KEY." },
        { status: 503 }
      );
    }

    const body: ContinueVideoRequest = await request.json();
    const { sceneId, parentVideoId, description, lastFrameUrl } = body;

    console.log(`${logPrefix} Request params:`, { sceneId, parentVideoId, description: description?.substring(0, 50), hasLastFrameUrl: !!lastFrameUrl });

    if (!sceneId || typeof sceneId !== "string") {
      return NextResponse.json(
        { error: "Scene ID is required" },
        { status: 400 }
      );
    }

    if (!parentVideoId || typeof parentVideoId !== "string") {
      return NextResponse.json(
        { error: "Parent video ID is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const scene = await getSceneById(sceneId);
    console.log(`${logPrefix} Found scene:`, scene.id, "project:", scene.projectId);

    const project = await getProjectById(scene.projectId);
    console.log(`${logPrefix} Verified project ownership:`, project.id);

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
      console.warn(`${logPrefix} Unauthorized access to project`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parentVideo = await getVideoById(parentVideoId);
    console.log(`${logPrefix} Found parent video:`, parentVideo.id, "scene:", parentVideo.sceneId);

    if (parentVideo.sceneId !== sceneId) {
      console.warn(`${logPrefix} Parent video does not belong to scene`);
      return NextResponse.json(
        { error: "Parent video does not belong to this scene" },
        { status: 400 }
      );
    }

    if (!parentVideo.url && !parentVideo.storagePath) {
      console.error(`${logPrefix} Parent video has no URL or storage path`);
      return NextResponse.json(
        { error: "Parent video is not yet completed or has no valid URL" },
        { status: 400 }
      );
    }

    let firstFrameUrl: string;

    if (lastFrameUrl && typeof lastFrameUrl === "string") {
      console.log(`${logPrefix} Using provided last frame URL`);
      firstFrameUrl = lastFrameUrl;
    } else {
      console.log(`${logPrefix} Looking for last frame in materials table`);
      const lastFrameMaterial = await getLatestMaterialBySceneId(sceneId, "image");

      if (!lastFrameMaterial) {
        console.log(`${logPrefix} No last frame material found, checking for latest image`);
        const latestImage = await getLatestImageBySceneId(sceneId);

        if (!latestImage) {
          console.error(`${logPrefix} No image found for scene`);
          return NextResponse.json(
            { error: "No last frame available. Please extract the last frame from the parent video first, or provide lastFrameUrl parameter." },
            { status: 400 }
          );
        }

        console.log(`${logPrefix} Using latest image as first frame`);
        firstFrameUrl = await getSignedUrl(latestImage.storagePath);
      } else {
        console.log(`${logPrefix} Found last frame material:`, lastFrameMaterial.id);
        firstFrameUrl = await getSignedUrl(lastFrameMaterial.storagePath);
      }
    }

    console.log(`${logPrefix} First frame URL obtained (length: ${firstFrameUrl.length})`);

    await updateSceneVideoStatus(sceneId, "processing");
    console.log(`${logPrefix} Updated scene video status to processing`);

    let taskId: string;
    let videoId: string;

    try {
      const task = await createVideoTask(firstFrameUrl, description, {
        duration: 5,
        watermark: false,
      });
      taskId = task.taskId;
      console.log(`${logPrefix} Video task created:`, taskId);

      const video = await createProcessingVideo(sceneId, taskId);
      videoId = video.id;
      console.log(`${logPrefix} Processing video record created:`, videoId);
    } catch (generationError) {
      console.error(`${logPrefix} Video generation failed:`, generationError);
      await updateSceneVideoStatus(sceneId, "failed");
      throw generationError;
    }

    let chainItemId: string;

    try {
      const existingChainItem = await getVideoChainByVideoId(parentVideoId);

      if (existingChainItem) {
        console.log(`${logPrefix} Parent video is in chain:`, existingChainItem.chainId);
        const chainItem = await appendVideoToChain(
          existingChainItem.chainId,
          videoId,
          parentVideoId
        );
        chainItemId = chainItem.id;
        console.log(`${logPrefix} Appended to existing chain, item:`, chainItemId);
      } else {
        console.log(`${logPrefix} Creating new video chain for project:`, project.id);
        const newChain = await createVideoChain({
          projectId: project.id,
          name: `Chain for scene ${scene.orderIndex + 1}`,
        });
        console.log(`${logPrefix} New chain created:`, newChain.id);

        const parentChainItem = await appendVideoToChain(newChain.id, parentVideoId);
        console.log(`${logPrefix} Parent video added to chain:`, parentChainItem.id);

        const childChainItem = await appendVideoToChain(newChain.id, videoId, parentVideoId);
        chainItemId = childChainItem.id;
        console.log(`${logPrefix} New video appended to chain:`, chainItemId);
      }
    } catch (chainError) {
      console.error(`${logPrefix} Chain operation failed (non-critical):`, chainError);
      chainItemId = "";
    }

    console.log(`${logPrefix} Continue video generation completed successfully`);

    return NextResponse.json({
      success: true,
      taskId,
      videoId,
      chainItemId,
      message: "Continuation video task created successfully",
    });
  } catch (error) {
    console.error(`${logPrefix} Error creating continuation video:`, error);

    if (error instanceof VolcVideoApiError) {
      return NextResponse.json(
        { error: `Video generation error: ${error.message}` },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to create continuation video task" },
      { status: 500 }
    );
  }
}

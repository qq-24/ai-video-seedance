import { NextResponse } from "next/server";
import { getScenesByProjectId, updateSceneImageStatus } from "@/lib/db/scenes";
import { getProjectById, updateProjectStage } from "@/lib/db/projects";
import {
  generateImage,
  isVolcImageConfigured,
  VolcImageApiError,
} from "@/lib/ai/volc-image";
import {
  uploadAndCreateImage,
  deleteOldSceneImages,
} from "@/lib/db/media";
import { isLoggedIn } from "@/lib/auth";
import type { Image } from "@prisma/client";

interface GenerationResult {
  sceneId: string;
  orderIndex: number;
  success: boolean;
  image?: Image;
  error?: string;
}

async function generateSceneImage(
  projectId: string,
  sceneId: string,
  orderIndex: number,
  description: string,
  style?: string
): Promise<GenerationResult> {
  try {
    await updateSceneImageStatus(sceneId, "processing");

    const imageBase64 = await generateImage(description, style, {
      size: "2K",
    });

    await deleteOldSceneImages(sceneId);

    const timestamp = Date.now();
    const fileName = `scene-${orderIndex}-${timestamp}.png`;

    const image = await uploadAndCreateImage(
      "",
      projectId,
      sceneId,
      fileName,
      imageBase64,
      {
        width: 1024,
        height: 1024,
        contentType: "image/png",
      }
    );

    await updateSceneImageStatus(sceneId, "completed");

    return {
      sceneId,
      orderIndex,
      success: true,
      image,
    };
  } catch (error) {
    await updateSceneImageStatus(sceneId, "failed");

    return {
      sceneId,
      orderIndex,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isLoggedIn())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isVolcImageConfigured()) {
      return NextResponse.json(
        { error: "Image generation service is not configured. Please set VOLC_ACCESS_KEY and VOLC_SECRET_KEY." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const project = await getProjectById(projectId);

    const scenes = await getScenesByProjectId(projectId);

    const scenesToGenerate = scenes.filter(
      (scene) =>
        scene.descriptionConfirmed &&
        (scene.imageStatus === "pending" || scene.imageStatus === "failed")
    );

    if (scenesToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scenes require image generation.",
        results: [],
        completed: 0,
        failed: 0,
      });
    }

    if (project.stage === "scenes") {
      await updateProjectStage(projectId, "images");
    }

    const results: GenerationResult[] = [];

    for (const scene of scenesToGenerate) {
      const result = await generateSceneImage(
        projectId,
        scene.id,
        scene.orderIndex,
        scene.description,
        project.style ?? undefined
      );
      results.push(result);
    }

    const completed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Generated images for ${completed} scenes. ${failed} failed.`,
      results,
      completed,
      failed,
      total: scenesToGenerate.length,
    });
  } catch (error) {
    console.error("Error generating images:", error);

    if (error instanceof VolcImageApiError) {
      return NextResponse.json(
        { error: `Image generation error: ${error.message}` },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to generate images" },
      { status: 500 }
    );
  }
}

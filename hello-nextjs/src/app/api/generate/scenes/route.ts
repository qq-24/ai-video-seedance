import { NextResponse } from "next/server";
import { getProjectById, updateProjectStage } from "@/lib/db/projects";
import {
  createScenes,
  deleteScenesByProjectId,
} from "@/lib/db/scenes";
import {
  storyToScenes,
  isZhipuConfigured,
  ZhipuApiError,
} from "@/lib/ai/zhipu";
import { isLoggedIn } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (!(await isLoggedIn())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isZhipuConfigured()) {
      return NextResponse.json(
        { error: "AI service is not configured. Please set ZHIPU_API_KEY." },
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

    if (!project.story) {
      return NextResponse.json(
        { error: "Project has no story content. Please add a story first." },
        { status: 400 }
      );
    }

    const sceneDescriptions = await storyToScenes(project.story, project.style ?? undefined);

    if (sceneDescriptions.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate scenes. Please try again." },
        { status: 500 }
      );
    }

    await deleteScenesByProjectId(projectId);

    const newScenes = await createScenes(projectId, sceneDescriptions);

    await updateProjectStage(projectId, "scenes");

    return NextResponse.json({
      success: true,
      scenes: newScenes,
      message: `Successfully generated ${newScenes.length} scenes`,
    });
  } catch (error) {
    console.error("Error generating scenes:", error);

    if (error instanceof ZhipuApiError) {
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: 502 }
      );
    }

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to generate scenes" },
      { status: 500 }
    );
  }
}

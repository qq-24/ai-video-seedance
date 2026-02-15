/**
 * Scene description confirmation API.
 * POST /api/scenes/:id/confirm-description - Confirm a scene's description
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSceneById,
  confirmSceneDescription,
  getScenesByProjectId,
  SceneError,
} from "@/lib/db/scenes";
import { isProjectOwner, updateProjectStage } from "@/lib/db/projects";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/scenes/:id/confirm-description
 * Confirm a scene's description
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the scene to verify ownership
    const scene = await getSceneById(id);

    // Verify user owns the project
    const isOwner = await isProjectOwner(scene.project_id, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Confirm the description
    const updatedScene = await confirmSceneDescription(id);

    // Check if all descriptions are now confirmed → advance to images stage
    const allScenes = await getScenesByProjectId(scene.project_id);
    const allDescriptionsConfirmed = allScenes.every((s) => s.description_confirmed || s.id === id);
    let stageAdvanced = false;
    if (allDescriptionsConfirmed) {
      await updateProjectStage(scene.project_id, user.id, "images");
      stageAdvanced = true;
    }

    return NextResponse.json({ scene: updatedScene, allConfirmed: allDescriptionsConfirmed, stageAdvanced });
  } catch (error) {
    if (error instanceof SceneError) {
      if (error.code === "not_found") {
        return NextResponse.json({ error: "Scene not found" }, { status: 404 });
      }
    }
    console.error("Error confirming scene description:", error);
    return NextResponse.json(
      { error: "Failed to confirm scene description" },
      { status: 500 }
    );
  }
}

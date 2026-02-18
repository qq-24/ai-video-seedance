/**
 * Scene description confirmation API.
 * POST /api/scenes/:id/confirm-description - Confirm a scene's description
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getSceneById,
  confirmSceneDescription,
  SceneError,
} from "@/lib/db/scenes";
import { isProjectOwner } from "@/lib/db/projects";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/scenes/:id/confirm-description
 * Confirm a scene's description
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the scene to verify ownership
    const scene = await getSceneById(id);

    // Verify user owns the project (single user mode - always true)
    const isOwner = await isProjectOwner(scene.projectId);
    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Confirm the description
    const updatedScene = await confirmSceneDescription(id);

    return NextResponse.json({ scene: updatedScene });
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

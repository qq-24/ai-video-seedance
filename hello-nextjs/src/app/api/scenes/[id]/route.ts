import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateSceneDescription, getSceneById } from "@/lib/db/scenes";
import { isProjectOwner } from "@/lib/db/projects";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/scenes/:id
 * Update a scene's description
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Verify user owns the scene's project
    const scene = await getSceneById(id);
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the scene description
    const updatedScene = await updateSceneDescription(id, description);

    return NextResponse.json({ scene: updatedScene });
  } catch (error) {
    console.error("Update scene error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

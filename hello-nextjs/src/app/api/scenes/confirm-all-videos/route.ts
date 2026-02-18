/**
 * Confirm all scene videos API.
 * POST /api/scenes/confirm-all-videos - Confirm all scene videos for a project
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { confirmAllVideos, SceneError } from "@/lib/db/scenes";
import { isProjectOwner, updateProjectStage, ProjectError } from "@/lib/db/projects";

/**
 * POST /api/scenes/confirm-all-videos
 * Confirm all scene videos for a project and mark project as completed
 * Body: { projectId: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify user owns the project (single user mode - always true)
    const isOwner = await isProjectOwner(projectId);
    if (!isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Confirm all videos (only those with completed status)
    const count = await confirmAllVideos(projectId);

    // Update project stage to 'completed'
    await updateProjectStage(projectId, "completed");

    return NextResponse.json({ count, stage: "completed" });
  } catch (error) {
    if (error instanceof SceneError) {
      if (error.code === "not_found") {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }
    if (error instanceof ProjectError) {
      if (error.code === "not_found") {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }
    console.error("Error confirming all videos:", error);
    return NextResponse.json(
      { error: "Failed to confirm all videos" },
      { status: 500 }
    );
  }
}

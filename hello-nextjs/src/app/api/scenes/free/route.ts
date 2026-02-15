/**
 * Free mode scene creation API.
 * POST /api/scenes/free - Create a new free mode scene for a project
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, description, orderIndex } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create the free mode scene
    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .insert({
        project_id: projectId,
        description: description || "",
        order_index: typeof orderIndex === "number" ? orderIndex : 0,
        mode: "free",
        description_confirmed: true,
        image_status: "pending",
        image_confirmed: false,
        video_status: "pending",
        video_confirmed: false,
      })
      .select()
      .single();

    if (sceneError || !scene) {
      console.error("Error creating free scene:", sceneError);
      return NextResponse.json(
        { error: "Failed to create scene" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, scene });
  } catch (error) {
    console.error("[scenes/free] Error:", error);
    return NextResponse.json(
      { error: "Failed to create free scene" },
      { status: 500 }
    );
  }
}

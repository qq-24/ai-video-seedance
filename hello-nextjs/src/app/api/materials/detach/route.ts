import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getMaterialById, deleteMaterial } from "@/lib/db/materials";

/**
 * POST /api/materials/detach
 * Remove a material from a scene (does not delete the file, only deletes the database record)
 */
export async function POST(request: Request) {
  try {
    console.log("[POST /api/materials/detach] Starting request");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[POST /api/materials/detach] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { materialId } = body;

    if (!materialId) {
      console.log("[POST /api/materials/detach] Missing materialId");
      return NextResponse.json(
        { error: "materialId is required" },
        { status: 400 }
      );
    }

    console.log("[POST /api/materials/detach] Detaching material:", materialId);

    const material = await getMaterialById(materialId);

    if (!material) {
      console.log("[POST /api/materials/detach] Material not found:", materialId);
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", material.scene_id)
      .single();

    if (sceneError || !scene) {
      console.log("[POST /api/materials/detach] Scene not found for material");
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const projectData = scene.projects as { user_id: string };
    if (projectData.user_id !== user.id) {
      console.log("[POST /api/materials/detach] Forbidden - user does not own material");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteMaterial(materialId);

    console.log("[POST /api/materials/detach] Material detached successfully (DB record deleted, file preserved):", materialId);
    return NextResponse.json({
      success: true,
      storage_path: material.storage_path,
      message: "Material detached from scene. File preserved in storage."
    });
  } catch (error) {
    console.error("[POST /api/materials/detach] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

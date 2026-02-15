import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getMaterialById, updateMaterial } from "@/lib/db/materials";

/**
 * POST /api/materials/attach
 * 关联素材到场景（用于已上传但未关联的素材）
 */
export async function POST(request: Request) {
  try {
    console.log("[POST /api/materials/attach] Starting request");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[POST /api/materials/attach] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { materialId, sceneId } = body;

    if (!materialId || !sceneId) {
      console.log("[POST /api/materials/attach] Missing required fields");
      return NextResponse.json(
        { error: "materialId and sceneId are required" },
        { status: 400 }
      );
    }

    console.log("[POST /api/materials/attach] Attaching material:", materialId, "to scene:", sceneId);

    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", sceneId)
      .single();

    if (sceneError || !scene) {
      console.log("[POST /api/materials/attach] Scene not found:", sceneId);
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const projectData = scene.projects as { user_id: string };
    if (projectData.user_id !== user.id) {
      console.log("[POST /api/materials/attach] Forbidden - user does not own scene");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const material = await getMaterialById(materialId);

    if (!material) {
      console.log("[POST /api/materials/attach] Material not found:", materialId);
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (material.scene_id === sceneId) {
      console.log("[POST /api/materials/attach] Material already attached to this scene");
      return NextResponse.json({
        material,
        message: "Material already attached to this scene"
      });
    }

    const { data: existingMaterials, error: countError } = await supabase
      .from("materials")
      .select("id")
      .eq("scene_id", sceneId);

    if (countError) {
      console.error("[POST /api/materials/attach] Error counting existing materials:", countError);
      return NextResponse.json(
        { error: "Failed to get existing materials" },
        { status: 500 }
      );
    }

    const nextOrderIndex = existingMaterials?.length ?? 0;

    const updatedMaterial = await updateMaterial(materialId, {
      scene_id: sceneId,
      order_index: nextOrderIndex,
    });

    console.log("[POST /api/materials/attach] Material attached successfully");
    return NextResponse.json({ material: updatedMaterial });
  } catch (error) {
    console.error("[POST /api/materials/attach] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

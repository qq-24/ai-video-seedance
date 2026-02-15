import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getMaterialsBySceneId,
  deleteMaterial,
  getMaterialById,
} from "@/lib/db/materials";
import type { Material } from "@/types/database";

/**
 * GET /api/materials?sceneId=xxx
 * Get all materials for a scene
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[GET /api/materials] Starting request");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[GET /api/materials] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get("sceneId");

    if (!sceneId) {
      console.log("[GET /api/materials] Missing sceneId parameter");
      return NextResponse.json(
        { error: "sceneId query parameter is required" },
        { status: 400 }
      );
    }

    console.log("[GET /api/materials] Fetching materials for scene:", sceneId);

    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", sceneId)
      .single();

    if (sceneError || !scene) {
      console.log("[GET /api/materials] Scene not found:", sceneId);
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const projectData = scene.projects as { user_id: string };
    if (projectData.user_id !== user.id) {
      console.log("[GET /api/materials] Forbidden - user does not own scene");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const materials = await getMaterialsBySceneId(sceneId);

    console.log("[GET /api/materials] Successfully fetched", materials.length, "materials");
    return NextResponse.json({ materials });
  } catch (error) {
    console.error("[GET /api/materials] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials
 * Delete a material (also deletes the file from Supabase Storage)
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log("[DELETE /api/materials] Starting request");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[DELETE /api/materials] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { materialId } = body;

    if (!materialId) {
      console.log("[DELETE /api/materials] Missing materialId");
      return NextResponse.json(
        { error: "materialId is required" },
        { status: 400 }
      );
    }

    console.log("[DELETE /api/materials] Deleting material:", materialId);

    const material = await getMaterialById(materialId);

    if (!material) {
      console.log("[DELETE /api/materials] Material not found:", materialId);
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", material.scene_id)
      .single();

    if (sceneError || !scene) {
      console.log("[DELETE /api/materials] Scene not found for material");
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const projectData = scene.projects as { user_id: string };
    if (projectData.user_id !== user.id) {
      console.log("[DELETE /api/materials] Forbidden - user does not own material");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storagePath = material.storage_path;
    console.log("[DELETE /api/materials] Storage path to delete:", storagePath);

    const { error: storageError } = await supabase.storage
      .from("materials")
      .remove([storagePath]);

    if (storageError) {
      console.error("[DELETE /api/materials] Error deleting from storage:", storageError);
    } else {
      console.log("[DELETE /api/materials] Successfully deleted from storage");
    }

    await deleteMaterial(materialId);

    console.log("[DELETE /api/materials] Material deleted successfully:", materialId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/materials] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

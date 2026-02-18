import { NextResponse } from "next/server";
import { getMaterialById, updateMaterial, getMaterialsBySceneId } from "@/lib/db/materials";
import { getSceneById } from "@/lib/db/scenes";
import { isProjectOwner } from "@/lib/db/projects";
import { getSession } from "@/lib/auth/session";
import type { Material } from "@prisma/client";

/**
 * POST /api/materials/attach
 * 关联素材到场景（用于已上传但未关联的素材）
 */
export async function POST(request: Request) {
  try {
    console.log("[POST /api/materials/attach] Starting request");

    const session = await getSession();
    if (!session.isLoggedIn) {
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

    const scene = await getSceneById(sceneId);

    if (!scene) {
      console.log("[POST /api/materials/attach] Scene not found:", sceneId);
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
      console.log("[POST /api/materials/attach] Forbidden - user does not own scene");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const material = await getMaterialById(materialId);

    if (!material) {
      console.log("[POST /api/materials/attach] Material not found:", materialId);
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    if (material.sceneId === sceneId) {
      console.log("[POST /api/materials/attach] Material already attached to this scene");
      return NextResponse.json({
        material,
        message: "Material already attached to this scene"
      });
    }

    const existingMaterials = await getMaterialsBySceneId(sceneId);
    const nextOrderIndex = existingMaterials.length;

    const updatedMaterial = await updateMaterial(materialId, {
      sceneId,
      orderIndex: nextOrderIndex,
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

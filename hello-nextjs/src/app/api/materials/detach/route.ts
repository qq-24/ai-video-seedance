import { NextResponse } from "next/server";
import { getMaterialById, deleteMaterial } from "@/lib/db/materials";
import { getSceneById } from "@/lib/db/scenes";
import { isProjectOwner } from "@/lib/db/projects";
import { getSession } from "@/lib/auth/session";
import type { Material } from "@prisma/client";

/**
 * POST /api/materials/detach
 * 从场景移除素材（不删除文件，仅删除数据库记录）
 */
export async function POST(request: Request) {
  try {
    console.log("[POST /api/materials/detach] Starting request");

    const session = await getSession();
    if (!session.isLoggedIn) {
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

    const scene = await getSceneById(material.sceneId);

    if (!scene) {
      console.log("[POST /api/materials/detach] Scene not found for material");
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
      console.log("[POST /api/materials/detach] Forbidden - user does not own material");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteMaterial(materialId);

    console.log("[POST /api/materials/detach] Material detached successfully (DB record deleted, file preserved):", materialId);
    return NextResponse.json({
      success: true,
      storagePath: material.storagePath,
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

import { NextRequest, NextResponse } from "next/server";
import {
  getMaterialsBySceneId,
  deleteMaterial,
  getMaterialById,
} from "@/lib/db/materials";
import { getSceneById } from "@/lib/db/scenes";
import { isProjectOwner } from "@/lib/db/projects";
import { deleteFile } from "@/lib/db/media";
import { getSession } from "@/lib/auth/session";
import type { Material } from "@prisma/client";

/**
 * GET /api/materials?sceneId=xxx
 * 获取场景的所有素材
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[GET /api/materials] Starting request");

    const session = await getSession();
    if (!session.isLoggedIn) {
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

    const scene = await getSceneById(sceneId);

    if (!scene) {
      console.log("[GET /api/materials] Scene not found:", sceneId);
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
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
 * 删除素材（同时删除本地存储中的文件）
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log("[DELETE /api/materials] Starting request");

    const session = await getSession();
    if (!session.isLoggedIn) {
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

    const scene = await getSceneById(material.sceneId);

    if (!scene) {
      console.log("[DELETE /api/materials] Scene not found for material");
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
      console.log("[DELETE /api/materials] Forbidden - user does not own material");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storagePath = material.storagePath;
    console.log("[DELETE /api/materials] Storage path to delete:", storagePath);

    try {
      await deleteFile(storagePath);
      console.log("[DELETE /api/materials] Successfully deleted from storage");
    } catch (storageError) {
      console.error("[DELETE /api/materials] Error deleting from storage:", storageError);
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

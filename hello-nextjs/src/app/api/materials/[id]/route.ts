import { NextResponse } from "next/server";
import { getMaterialById, updateMaterial } from "@/lib/db/materials";
import { getSceneById } from "@/lib/db/scenes";
import { isProjectOwner } from "@/lib/db/projects";
import { getSession } from "@/lib/auth/session";
import type { Material } from "@prisma/client";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/materials/:id
 * 获取单个素材详情
 */
export async function GET(request: Request, { params }: Params) {
  try {
    console.log("[GET /api/materials/:id] Starting request");

    const session = await getSession();
    if (!session.isLoggedIn) {
      console.log("[GET /api/materials/:id] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log("[GET /api/materials/:id] Fetching material:", id);

    const material = await getMaterialById(id);

    if (!material) {
      console.log("[GET /api/materials/:id] Material not found:", id);
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const scene = await getSceneById(material.sceneId);

    if (!scene) {
      console.log("[GET /api/materials/:id] Scene not found for material");
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
      console.log("[GET /api/materials/:id] Forbidden - user does not own material");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[GET /api/materials/:id] Successfully fetched material:", id);
    return NextResponse.json({ material });
  } catch (error) {
    console.error("[GET /api/materials/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/materials/:id
 * 更新素材信息（如 orderIndex）
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    console.log("[PATCH /api/materials/:id] Starting request");

    const session = await getSession();
    if (!session.isLoggedIn) {
      console.log("[PATCH /api/materials/:id] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { orderIndex, order_index, metadata } = body;

    console.log("[PATCH /api/materials/:id] Updating material:", id, "with:", { orderIndex, order_index, metadata });

    const material = await getMaterialById(id);

    if (!material) {
      console.log("[PATCH /api/materials/:id] Material not found:", id);
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const scene = await getSceneById(material.sceneId);

    if (!scene) {
      console.log("[PATCH /api/materials/:id] Scene not found for material");
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
      console.log("[PATCH /api/materials/:id] Forbidden - user does not own material");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: { metadata?: string; orderIndex?: number } = {};
    if (typeof orderIndex === "number") {
      updates.orderIndex = orderIndex;
    } else if (typeof order_index === "number") {
      updates.orderIndex = order_index;
    }
    if (metadata !== undefined) {
      updates.metadata = metadata;
    }

    if (Object.keys(updates).length === 0) {
      console.log("[PATCH /api/materials/:id] No valid fields to update");
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedMaterial = await updateMaterial(id, updates);

    console.log("[PATCH /api/materials/:id] Material updated successfully:", id);
    return NextResponse.json({ material: updatedMaterial });
  } catch (error) {
    console.error("[PATCH /api/materials/:id] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

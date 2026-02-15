import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getMaterialById, updateMaterial } from "@/lib/db/materials";
import type { MaterialUpdate } from "@/types/database";

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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

    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", material.scene_id)
      .single();

    if (sceneError || !scene) {
      console.log("[GET /api/materials/:id] Scene not found for material");
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const projectData = scene.projects as { user_id: string };
    if (projectData.user_id !== user.id) {
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
 * 更新素材信息（如 order_index）
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    console.log("[PATCH /api/materials/:id] Starting request");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[PATCH /api/materials/:id] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { order_index, metadata } = body;

    console.log("[PATCH /api/materials/:id] Updating material:", id, "with:", { order_index, metadata });

    const material = await getMaterialById(id);

    if (!material) {
      console.log("[PATCH /api/materials/:id] Material not found:", id);
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", material.scene_id)
      .single();

    if (sceneError || !scene) {
      console.log("[PATCH /api/materials/:id] Scene not found for material");
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const projectData = scene.projects as { user_id: string };
    if (projectData.user_id !== user.id) {
      console.log("[PATCH /api/materials/:id] Forbidden - user does not own material");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: MaterialUpdate = {};
    if (typeof order_index === "number") {
      updates.order_index = order_index;
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

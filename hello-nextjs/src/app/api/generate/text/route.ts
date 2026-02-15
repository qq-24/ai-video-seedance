import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText, isZhipuConfigured } from "@/lib/ai/zhipu";
import { createMaterial } from "@/lib/db/materials";
import type { MaterialInsert } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isZhipuConfigured()) {
      return NextResponse.json(
        { error: "AI service is not configured. Please set ZHIPU_API_KEY." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { prompt, sceneId } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    if (!sceneId) {
      return NextResponse.json({ error: "sceneId is required" }, { status: 400 });
    }

    // Verify scene ownership
    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", sceneId)
      .single();

    if (sceneError || !scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const projectData = scene.projects as { user_id: string };
    if (projectData.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const text = await generateText(prompt.trim());

    // Save as text material attached to scene
    const materialData: MaterialInsert = {
      scene_id: sceneId,
      type: "text",
      storage_path: "",
      url: "",
      metadata: { content: text, prompt: prompt.trim() },
      order_index: 0,
    };

    const material = await createMaterial(materialData);

    return NextResponse.json({
      success: true,
      text,
      material: { id: material.id, type: material.type },
    });
  } catch (error) {
    console.error("[generate/text] Error:", error);
    return NextResponse.json({ error: "Failed to generate text" }, { status: 500 });
  }
}

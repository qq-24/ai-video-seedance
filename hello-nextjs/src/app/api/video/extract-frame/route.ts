import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractLastFrame } from "@/lib/video/frame-extractor";
import { getSignedUrl } from "@/lib/db/media";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, sceneId } = body;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    // Get video record
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id, scene_id, storage_path, url")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Verify ownership through scene -> project -> user chain
    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", video.scene_id)
      .single();

    if (sceneError || !scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const projectData = scene.projects as { user_id: string };
    if (projectData.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get signed URL for the video
    const signedUrl = await getSignedUrl(video.storage_path);

    const result = await extractLastFrame(signedUrl, {
      uploadToStorage: true,
      userId: user.id,
      sceneId: sceneId || video.scene_id,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        needsClientExtraction: result.needsClientExtraction ?? false,
        error: result.error,
      }, { status: result.needsClientExtraction ? 200 : 500 });
    }

    return NextResponse.json({
      success: true,
      frameBase64: result.frameBase64,
      frameUrl: result.frameUrl,
    });
  } catch (error) {
    console.error("[video/extract-frame] Error:", error);
    return NextResponse.json({ error: "Failed to extract frame" }, { status: 500 });
  }
}

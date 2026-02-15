/**
 * Combine all scene videos into one.
 * POST /api/projects/[id]/combine-videos
 * Downloads scene videos from storage, concatenates with FFmpeg, returns the combined file.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectById } from "@/lib/db/projects";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let project;
  try {
    project = await getProjectById(projectId, user.id);
  } catch {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.stage !== "completed") {
    return NextResponse.json(
      { error: "Project must be completed to combine videos" },
      { status: 400 }
    );
  }

  // Collect video storage paths in scene order
  const scenesWithVideos = project.scenes
    .filter((s) => s.videos.length > 0 && s.videos[0].storage_path)
    .sort((a, b) => a.order_index - b.order_index);

  if (scenesWithVideos.length === 0) {
    return NextResponse.json(
      { error: "No videos found to combine" },
      { status: 400 }
    );
  }

  // Create temp directory for work
  const workDir = join(tmpdir(), `combine-${projectId}-${Date.now()}`);
  await mkdir(workDir, { recursive: true });

  const inputFiles: string[] = [];

  try {
    // Download each video from Supabase storage
    for (let i = 0; i < scenesWithVideos.length; i++) {
      const scene = scenesWithVideos[i];
      const video = scene.videos[0];
      const filePath = join(workDir, `scene-${i}.mp4`);

      const { data, error } = await supabase.storage
        .from("project-media")
        .download(video.storage_path);

      if (error || !data) {
        throw new Error(`Failed to download video for scene ${scene.order_index + 1}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      await writeFile(filePath, buffer);
      inputFiles.push(filePath);
    }

    // Create FFmpeg concat file list
    const concatListPath = join(workDir, "concat.txt");
    const concatContent = inputFiles.map((f) => `file '${f}'`).join("\n");
    await writeFile(concatListPath, concatContent);

    // Run FFmpeg to concatenate
    const outputPath = join(workDir, "combined.mp4");
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}"`,
      { timeout: 120000 }
    );

    // Read combined file
    const combinedBuffer = await readFile(outputPath);

    // Clean up temp files
    for (const f of inputFiles) {
      await unlink(f).catch(() => {});
    }
    await unlink(concatListPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    // Return as downloadable file
    return new Response(combinedBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${project.title || "combined"}.mp4"`,
        "Content-Length": String(combinedBuffer.length),
      },
    });
  } catch (error) {
    // Clean up on error
    for (const f of inputFiles) {
      await unlink(f).catch(() => {});
    }

    console.error("Error combining videos:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to combine videos" },
      { status: 500 }
    );
  }
}

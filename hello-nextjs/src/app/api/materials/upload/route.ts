import { NextRequest, NextResponse } from "next/server";
import { createMaterial, getMaterialsBySceneId } from "@/lib/db/materials";
import { getSceneById } from "@/lib/db/scenes";
import { isProjectOwner } from "@/lib/db/projects";
import { uploadFile, getPublicUrl } from "@/lib/storage";
import { getSession } from "@/lib/auth/session";
import type { StorageBucket } from "@/lib/storage";
import type { Material } from "@prisma/client";

const MATERIALS_BUCKET = "materials";

type MaterialType = "audio" | "video" | "image" | "text";

const FILE_CONFIGS = {
  audio: {
    extensions: ["mp3", "wav", "m4a"],
    maxSize: 50 * 1024 * 1024,
    contentTypes: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"],
  },
  video: {
    extensions: ["mp4", "mov", "webm"],
    maxSize: 200 * 1024 * 1024,
    contentTypes: ["video/mp4", "video/quicktime", "video/webm"],
  },
  image: {
    extensions: ["png", "jpg", "jpeg", "webp"],
    maxSize: 10 * 1024 * 1024,
    contentTypes: ["image/png", "image/jpeg", "image/webp"],
  },
  text: {
    extensions: ["txt", "md", "json"],
    maxSize: 1 * 1024 * 1024,
    contentTypes: ["text/plain", "text/markdown", "application/json"],
  },
} as const;

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot + 1).toLowerCase();
}

function validateFile(
  file: File,
  type: MaterialType
): { valid: boolean; error?: string } {
  const config = FILE_CONFIGS[type];

  if (!config) {
    return { valid: false, error: `Invalid material type: ${type}` };
  }

  const extension = getFileExtension(file.name);
  const validExtensions = config.extensions as readonly string[];
  if (!validExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension for ${type}. Allowed: ${config.extensions.join(", ")}`,
    };
  }

  if (file.size > config.maxSize) {
    const maxMB = config.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxMB}MB limit for ${type} files`,
    };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  console.log("[materials/upload] Starting upload process");

  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      console.error("[materials/upload] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[materials/upload] User authenticated");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sceneId = formData.get("sceneId") as string | null;
    const type = formData.get("type") as MaterialType | null;

    if (!file) {
      console.error("[materials/upload] No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!sceneId) {
      console.error("[materials/upload] No sceneId provided");
      return NextResponse.json({ error: "No sceneId provided" }, { status: 400 });
    }

    if (!type) {
      console.error("[materials/upload] No type provided");
      return NextResponse.json({ error: "No type provided" }, { status: 400 });
    }

    const validTypes: MaterialType[] = ["audio", "video", "image", "text"];
    if (!validTypes.includes(type)) {
      console.error("[materials/upload] Invalid type:", type);
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    console.log("[materials/upload] Validating file:", file.name, "type:", type);
    const validation = validateFile(file, type);
    if (!validation.valid) {
      console.error("[materials/upload] Validation failed:", validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const scene = await getSceneById(sceneId);
    if (!scene) {
      console.error("[materials/upload] Scene not found:", sceneId);
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const isOwner = await isProjectOwner(scene.projectId, "local-user");
    if (!isOwner) {
      console.error("[materials/upload] Forbidden - user does not own scene");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFilename = `${timestamp}_${sanitizedFilename}`;

    console.log("[materials/upload] Uploading file:", uniqueFilename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("[materials/upload] Uploading to storage, size:", buffer.length, "bytes");

    const uploadResult = await uploadFile(
      MATERIALS_BUCKET as StorageBucket,
      uniqueFilename,
      buffer
    );

    console.log("[materials/upload] File uploaded successfully");

    const publicUrl = uploadResult.url;
    console.log("[materials/upload] Public URL generated:", publicUrl);

    const existingMaterials = await getMaterialsBySceneId(sceneId);
    const nextOrderIndex = existingMaterials.length;

    const metadata = {
      size: file.size,
      originalName: file.name,
      mimeType: file.type,
    };

    console.log("[materials/upload] Creating material record with order:", nextOrderIndex);

    const material = await createMaterial({
      sceneId,
      type,
      storagePath: uploadResult.path,
      url: publicUrl,
      metadata: JSON.stringify(metadata),
      orderIndex: nextOrderIndex,
    });

    console.log("[materials/upload] Material created successfully:", material.id);

    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        sceneId: material.sceneId,
        type: material.type,
        storagePath: material.storagePath,
        url: material.url,
        metadata: material.metadata,
        orderIndex: material.orderIndex,
        createdAt: material.createdAt,
      },
    });
  } catch (error) {
    console.error("[materials/upload] Unexpected error:", error);
    if (error instanceof Error) {
      console.error("[materials/upload] Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error during upload" },
      { status: 500 }
    );
  }
}

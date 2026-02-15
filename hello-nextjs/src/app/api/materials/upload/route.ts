import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMaterial } from "@/lib/db/materials";
import type { MaterialInsert, material_type, Json } from "@/types/database";

const MATERIALS_BUCKET = "materials";

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
  type: material_type
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

function getContentType(filename: string, type: material_type): string {
  const extension = getFileExtension(filename);
  const config = FILE_CONFIGS[type];

  const extensionToContentType: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
  };

  return extensionToContentType[extension] || config.contentTypes[0];
}

async function getMaxOrderIndex(sceneId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("materials")
    .select("order_index")
    .eq("scene_id", sceneId)
    .order("order_index", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[getMaxOrderIndex] Error fetching max order index:", error);
    return 0;
  }

  return data?.[0]?.order_index ?? -1;
}

export async function POST(request: NextRequest) {
  console.log("[materials/upload] Starting upload process");

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("[materials/upload] Unauthorized - no user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[materials/upload] User authenticated:", user.id);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sceneId = formData.get("sceneId") as string | null;
    const type = formData.get("type") as material_type | null;

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

    const validTypes: material_type[] = ["audio", "video", "image", "text"];
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

    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
    const storagePath = `${user.id}/${sceneId}/${uniqueFilename}`;

    console.log("[materials/upload] Storage path:", storagePath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = getContentType(file.name, type);

    console.log("[materials/upload] Uploading to storage, size:", buffer.length, "bytes");

    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[materials/upload] Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log("[materials/upload] File uploaded successfully");

    const { data: urlData } = supabase.storage
      .from(MATERIALS_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log("[materials/upload] Public URL generated:", publicUrl);

    const nextOrderIndex = (await getMaxOrderIndex(sceneId)) + 1;

    const metadata: Json = {
      size: file.size,
      originalName: file.name,
      mimeType: file.type || contentType,
    };

    const materialData: MaterialInsert = {
      scene_id: sceneId,
      type,
      storage_path: storagePath,
      url: publicUrl,
      metadata,
      order_index: nextOrderIndex,
    };

    console.log("[materials/upload] Creating material record with order:", nextOrderIndex);

    const material = await createMaterial(materialData);

    console.log("[materials/upload] Material created successfully:", material.id);

    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        scene_id: material.scene_id,
        type: material.type,
        storage_path: material.storage_path,
        url: material.url,
        metadata: material.metadata,
        order_index: material.order_index,
        created_at: material.created_at,
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

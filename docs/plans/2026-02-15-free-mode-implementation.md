# Free Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Free Mode" to the project detail page with per-scene materials management, natural language generation, and video chaining.

**Architecture:** Free Mode is a parallel view on the project detail page, toggled via `ModeSelector`. It renders all scenes in a flat list using `FreeSceneList` → `FreeSceneCard` components. Each card has a `MaterialsPanel`, a rewritten `NaturalLanguageInput`, and a `VideoContinueMenu`. Three new API routes handle frame extraction, video continuation, and text generation. The existing `volc-video.ts` is extended to accept materials.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS 4, Supabase, Zhipu AI GLM-4, Volcano Engine Seedance/Seedream

**Design Doc:** `docs/plans/2026-02-15-free-mode-design.md`

---

## Task 1: Text Generation API Route

**Files:**
- Create: `hello-nextjs/src/app/api/generate/text/route.ts`

This is the simplest new route and unblocks the NL input component later.

**Step 1: Create the route**

```typescript
// hello-nextjs/src/app/api/generate/text/route.ts
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
```

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors. Route registered as `f /api/generate/text`.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/app/api/generate/text/route.ts
git commit -m "feat: add text generation API route"
```

---

## Task 2: Frame Extraction API Route

**Files:**
- Create: `hello-nextjs/src/app/api/video/extract-frame/route.ts`

Wraps the existing `frame-extractor.ts` library into an API endpoint.

**Step 1: Create the route**

```typescript
// hello-nextjs/src/app/api/video/extract-frame/route.ts
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
```

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/app/api/video/extract-frame/route.ts
git commit -m "feat: add video frame extraction API route"
```

---

## Task 3: Video Continue API Route

**Files:**
- Create: `hello-nextjs/src/app/api/generate/video/continue/route.ts`
- Read (reference): `hello-nextjs/src/lib/ai/volc-video.ts`, `hello-nextjs/src/lib/video/frame-extractor.ts`, `hello-nextjs/src/lib/db/video-chains.ts`

Convenience endpoint: extract last frame from source video → generate new video with that frame → append to chain.

**Step 1: Create the route**

```typescript
// hello-nextjs/src/app/api/generate/video/continue/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractLastFrame } from "@/lib/video/frame-extractor";
import { createVideoTask } from "@/lib/ai/volc-video";
import { getSignedUrl } from "@/lib/db/media";
import {
  createVideoChain,
  appendVideoToChain,
  getVideoChainByVideoId,
} from "@/lib/db/video-chains";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceVideoId, targetSceneId, projectId, prompt } = body;

    if (!sourceVideoId || !targetSceneId || !projectId) {
      return NextResponse.json(
        { error: "sourceVideoId, targetSceneId, and projectId are required" },
        { status: 400 }
      );
    }

    // Get source video
    const { data: sourceVideo, error: videoError } = await supabase
      .from("videos")
      .select("id, scene_id, storage_path, url")
      .eq("id", sourceVideoId)
      .single();

    if (videoError || !sourceVideo) {
      return NextResponse.json({ error: "Source video not found" }, { status: 404 });
    }

    // Verify ownership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project || project.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Step 1: Extract last frame
    const signedUrl = await getSignedUrl(sourceVideo.storage_path);
    const frameResult = await extractLastFrame(signedUrl, {
      uploadToStorage: true,
      userId: user.id,
      sceneId: targetSceneId,
    });

    if (!frameResult.success || !frameResult.frameUrl) {
      return NextResponse.json({
        success: false,
        needsClientExtraction: frameResult.needsClientExtraction ?? false,
        error: frameResult.error || "Failed to extract last frame",
      }, { status: frameResult.needsClientExtraction ? 200 : 500 });
    }

    // Step 2: Create video task with extracted frame
    const frameSignedUrl = await getSignedUrl(
      frameResult.frameUrl.includes("/") ? frameResult.frameUrl : ""
    );
    const taskResult = await createVideoTask(
      frameResult.frameUrl,
      prompt || ""
    );

    // Step 3: Save video record
    const { data: newVideo, error: createError } = await supabase
      .from("videos")
      .insert({
        scene_id: targetSceneId,
        storage_path: "",
        url: "",
        task_id: taskResult.taskId,
        version: 1,
      })
      .select()
      .single();

    if (createError || !newVideo) {
      return NextResponse.json(
        { error: "Failed to create video record" },
        { status: 500 }
      );
    }

    // Update scene video_status
    await supabase
      .from("scenes")
      .update({ video_status: "processing" })
      .eq("id", targetSceneId);

    // Step 4: Manage chain
    let chainItem = await getVideoChainByVideoId(sourceVideoId);
    let chainId: string;

    if (chainItem) {
      chainId = chainItem.chain_id;
    } else {
      // Create new chain and add source video
      const chain = await createVideoChain({ project_id: projectId });
      chainId = chain.id;
      await appendVideoToChain(chainId, sourceVideoId);
    }

    await appendVideoToChain(chainId, newVideo.id, sourceVideoId);

    return NextResponse.json({
      success: true,
      taskId: taskResult.taskId,
      videoId: newVideo.id,
      chainId,
    });
  } catch (error) {
    console.error("[generate/video/continue] Error:", error);
    return NextResponse.json(
      { error: "Failed to continue video" },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/app/api/generate/video/continue/route.ts
git commit -m "feat: add video continuation API route with chaining"
```

---

## Task 4: Extend volc-video.ts to Accept Materials

**Files:**
- Modify: `hello-nextjs/src/lib/ai/volc-video.ts` (the `createVideoTask` function, ~line 100-140)

**Step 1: Add materials parameter to createVideoTask**

Add an optional `materials` parameter that maps attached materials into the Seedance `content` array.

In `volc-video.ts`, find the `createVideoTask` function and update its signature and content-building logic:

```typescript
// Updated signature:
export async function createVideoTask(
  imageUrl: string,
  prompt?: string,
  options: {
    duration?: number;
    watermark?: boolean;
    materials?: Array<{
      type: "image" | "video" | "text";
      url?: string;
      content?: string;
    }>;
  } = {}
): Promise<VideoTaskResult>
```

Then update the content array construction inside the function. After the existing `content` array is built (with the text and image_url entries), add:

```typescript
// After the existing content array entries, before the request is sent:
if (options.materials && options.materials.length > 0) {
  for (const material of options.materials) {
    if (material.type === "image" && material.url) {
      content.push({
        type: "image_url",
        image_url: { url: material.url },
      });
    } else if (material.type === "video" && material.url) {
      content.push({
        type: "video_url",
        video_url: { url: material.url },
      });
    } else if (material.type === "text" && material.content) {
      // Append text materials to the existing text entry
      const textEntry = content.find((c: { type: string }) => c.type === "text");
      if (textEntry && "text" in textEntry) {
        textEntry.text += "\n" + material.content;
      }
    }
  }
}
```

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors. The function is backward-compatible (materials param is optional).

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/lib/ai/volc-video.ts
git commit -m "feat: extend createVideoTask to accept multi-modal materials"
```

---

## Task 5: Update Video Generation Route for Free Mode Materials

**Files:**
- Modify: `hello-nextjs/src/app/api/generate/video/scene/[sceneId]/route.ts`
- Read (reference): `hello-nextjs/src/lib/db/materials.ts`

When a scene has `mode: 'free'`, fetch its attached materials and pass them to `createVideoTask`.

**Step 1: Add materials fetching to the video generation route**

At the top of the POST handler, after fetching the scene, add:

```typescript
import { getMaterialsBySceneId } from "@/lib/db/materials";
import { getSignedUrl } from "@/lib/db/media";
```

After getting the scene data, check if the scene is in free mode and fetch materials:

```typescript
// After scene is fetched, before calling createVideoTask:
let materials: Array<{ type: "image" | "video" | "text"; url?: string; content?: string }> = [];

if (scene.mode === "free") {
  const sceneMaterials = await getMaterialsBySceneId(sceneId);
  for (const mat of sceneMaterials) {
    if (mat.type === "image" && mat.storage_path) {
      const signedUrl = await getSignedUrl(mat.storage_path);
      materials.push({ type: "image", url: signedUrl });
    } else if (mat.type === "video" && mat.storage_path) {
      const signedUrl = await getSignedUrl(mat.storage_path);
      materials.push({ type: "video", url: signedUrl });
    } else if (mat.type === "text" && mat.metadata) {
      const content = typeof mat.metadata === "object" && mat.metadata !== null && "content" in mat.metadata
        ? String((mat.metadata as Record<string, unknown>).content)
        : "";
      if (content) {
        materials.push({ type: "text", content });
      }
    }
  }
}
```

Then pass `materials` to the `createVideoTask` call:

```typescript
const taskResult = await createVideoTask(imageSignedUrl, prompt, {
  ...existingOptions,
  materials,
});
```

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/app/api/generate/video/scene/
git commit -m "feat: include attached materials in video generation for free mode"
```

---

## Task 6: MaterialsPanel Component

**Files:**
- Create: `hello-nextjs/src/components/scene/MaterialsPanel.tsx`

The collapsible panel that displays attached materials and provides upload buttons.

**Step 1: Create the component**

```typescript
// hello-nextjs/src/components/scene/MaterialsPanel.tsx
"use client";

import { useState, useCallback } from "react";
import type { Material, material_type } from "@/types/database";

interface MaterialsPanelProps {
  sceneId: string;
  materials: Material[];
  onMaterialsChange: () => void;
}

const TYPE_LABELS: Record<material_type, string> = {
  audio: "Audio",
  video: "Video",
  image: "Image",
  text: "Text",
};

const TYPE_ACCEPT: Record<string, string> = {
  audio: "audio/mpeg,audio/wav,audio/mp4",
  image: "image/png,image/jpeg,image/webp",
};

export default function MaterialsPanel({
  sceneId,
  materials,
  onMaterialsChange,
}: MaterialsPanelProps) {
  const [isOpen, setIsOpen] = useState(materials.length > 0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File, type: material_type) => {
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sceneId", sceneId);
        formData.append("type", type);

        const res = await fetch("/api/materials/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        onMaterialsChange();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [sceneId, onMaterialsChange]
  );

  const handleDelete = useCallback(
    async (materialId: string) => {
      try {
        const res = await fetch("/api/materials", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Delete failed");
        }

        onMaterialsChange();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [onMaterialsChange]
  );

  const handleFileSelect = (type: material_type) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = TYPE_ACCEPT[type] || "*/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleUpload(file, type);
    };
    input.click();
  };

  const getMetadataContent = (material: Material): string | null => {
    if (
      material.type === "text" &&
      material.metadata &&
      typeof material.metadata === "object" &&
      "content" in material.metadata
    ) {
      const content = String(
        (material.metadata as Record<string, unknown>).content
      );
      return content.length > 80 ? content.slice(0, 80) + "..." : content;
    }
    return null;
  };

  return (
    <div className="border border-zinc-700 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg"
      >
        <span>
          Materials{" "}
          {materials.length > 0 && (
            <span className="ml-1 rounded-full bg-zinc-700 px-2 py-0.5 text-xs">
              {materials.length}
            </span>
          )}
        </span>
        <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="border-t border-zinc-700 px-3 py-2 space-y-2">
          {/* Material list */}
          {materials.map((mat) => (
            <div
              key={mat.id}
              className="flex items-center justify-between rounded bg-zinc-800 px-2 py-1.5 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-zinc-500 shrink-0">
                  {TYPE_LABELS[mat.type]}
                </span>
                <span className="truncate text-zinc-300">
                  {getMetadataContent(mat) ||
                    (mat.metadata &&
                    typeof mat.metadata === "object" &&
                    "originalName" in mat.metadata
                      ? String(
                          (mat.metadata as Record<string, unknown>).originalName
                        )
                      : mat.type)}
                </span>
              </div>
              <button
                onClick={() => handleDelete(mat.id)}
                className="ml-2 shrink-0 text-zinc-500 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Upload buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleFileSelect("audio")}
              disabled={uploading}
              className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
            >
              + Audio
            </button>
            <button
              onClick={() => handleFileSelect("image")}
              disabled={uploading}
              className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
            >
              + Image
            </button>
          </div>

          {uploading && (
            <p className="text-xs text-zinc-500">Uploading...</p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/components/scene/MaterialsPanel.tsx
git commit -m "feat: add MaterialsPanel component for per-scene materials"
```

---

## Task 7: Rewrite NaturalLanguageInput Component

**Files:**
- Modify: `hello-nextjs/src/components/materials/NaturalLanguageInput.tsx` (overwrite — current file is 52 lines and incomplete)

The rewritten component: text input → parse intent → execute generation → save as material → notify parent.

**Step 1: Rewrite the component**

Replace the entire file content with a complete working component. Key behaviors:
- Calls `POST /api/parse-intent` with user input
- Based on intent type, calls the appropriate generation endpoint:
  - `generate_image` → `POST /api/generate/image/{sceneId}` with the user's prompt overriding the description
  - `generate_text` → `POST /api/generate/text` with prompt + sceneId
  - `generate_video` → `POST /api/generate/video/scene/{sceneId}`
- Shows loading state and result feedback inline
- Calls `onMaterialsChange()` after successful generation so the parent refreshes the materials list
- Props: `sceneId`, `projectId`, `onMaterialsChange`, `placeholder?`

The component should be ~120-150 lines. Include:
- `useState` for `input`, `loading`, `status` (idle/parsing/generating/done/error), `statusMessage`
- `handleSubmit` that chains parse-intent → generation → callback
- Input field with send button, status display below

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/components/materials/NaturalLanguageInput.tsx
git commit -m "feat: rewrite NaturalLanguageInput with materials integration"
```

---

## Task 8: VideoContinueMenu Component

**Files:**
- Create: `hello-nextjs/src/components/scene/VideoContinueMenu.tsx`

Dropdown button with two options: "Continue this scene" and "Continue from Scene N".

**Step 1: Create the component**

```typescript
// hello-nextjs/src/components/scene/VideoContinueMenu.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VideoSource {
  videoId: string;
  sceneLabel: string;
}

interface VideoContinueMenuProps {
  currentSceneId: string;
  projectId: string;
  /** Video ID from the current scene (if it has one) */
  currentVideoId?: string;
  /** Videos from other scenes that can be used as source */
  otherSceneVideos: VideoSource[];
  onContinueStart: (taskId: string, videoId: string, chainId: string) => void;
  disabled?: boolean;
}

export default function VideoContinueMenu({
  currentSceneId,
  projectId,
  currentVideoId,
  otherSceneVideos,
  onContinueStart,
  disabled,
}: VideoContinueMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleContinue = useCallback(
    async (sourceVideoId: string) => {
      setLoading(true);
      setError(null);
      setOpen(false);
      try {
        const res = await fetch("/api/generate/video/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceVideoId,
            targetSceneId: currentSceneId,
            projectId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to continue video");
        }

        if (data.needsClientExtraction) {
          setError("Server-side frame extraction unavailable. Client extraction not yet implemented.");
          return;
        }

        onContinueStart(data.taskId, data.videoId, data.chainId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to continue video");
      } finally {
        setLoading(false);
      }
    },
    [currentSceneId, projectId, onContinueStart]
  );

  const hasAnySources = !!(currentVideoId || otherSceneVideos.length > 0);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || loading || !hasAnySources}
        className="rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
        title={!hasAnySources ? "No videos available to continue from" : undefined}
      >
        {loading ? "Processing..." : "Continue ▾"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-48 rounded border border-zinc-600 bg-zinc-800 py-1 shadow-lg">
          {currentVideoId && (
            <button
              onClick={() => handleContinue(currentVideoId)}
              className="block w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Continue this scene
            </button>
          )}
          {otherSceneVideos.map((source) => (
            <button
              key={source.videoId}
              onClick={() => handleContinue(source.videoId)}
              className="block w-full px-3 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Continue from {source.sceneLabel}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/components/scene/VideoContinueMenu.tsx
git commit -m "feat: add VideoContinueMenu component for video chaining"
```

---

## Task 9: FreeSceneCard Component

**Files:**
- Create: `hello-nextjs/src/components/scene/FreeSceneCard.tsx`
- Read (reference): `hello-nextjs/src/components/scene/SceneDescriptionCard.tsx` (for description editing pattern)

Combines all per-scene controls: description editor, materials panel, NL input, image/video preview, generation buttons, continue menu.

**Step 1: Create the component**

The component receives a scene with its media and materials. It renders:
1. Scene number + editable description (reuse pattern from `SceneDescriptionCard.tsx`)
2. Image/video preview (if generated)
3. `MaterialsPanel` with the scene's materials
4. `NaturalLanguageInput` wired to the materials system
5. Action buttons: "Generate Image", "Generate Video", `VideoContinueMenu`

Props interface:
```typescript
interface FreeSceneCardProps {
  scene: SceneWithMedia;
  materials: Material[];
  projectId: string;
  otherSceneVideos: Array<{ videoId: string; sceneLabel: string }>;
  onRefresh: () => void;
}
```

This is the largest component (~200-250 lines). It manages local state for:
- Description editing (edit mode, save via `PATCH /api/scenes/:id`)
- Image generation (loading state, call `POST /api/generate/image/:sceneId`)
- Video generation (loading state, call `POST /api/generate/video/scene/:sceneId`, poll for completion)
- Video continuation (delegate to `VideoContinueMenu`, poll for completion)

Use `useSignedUrls` hook for displaying images/videos (pattern from existing `SceneImageList.tsx`).

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/components/scene/FreeSceneCard.tsx
git commit -m "feat: add FreeSceneCard component for free mode scene editing"
```

---

## Task 10: FreeSceneList Component

**Files:**
- Create: `hello-nextjs/src/components/scene/FreeSceneList.tsx`

Renders all scenes as `FreeSceneCard` components. Fetches materials for each scene. Provides "Add Scene" button.

**Step 1: Create the component**

Props:
```typescript
interface FreeSceneListProps {
  projectId: string;
  scenes: SceneWithMedia[];
}
```

Behavior:
- On mount, fetch materials for all scenes via `GET /api/materials?sceneId=...` (one call per scene, in parallel)
- Store materials in state keyed by scene ID
- Map scenes to `FreeSceneCard`, passing each scene its materials and a list of other scenes' videos (for cross-scene chaining)
- "Add Scene" button at the bottom creates a new scene via the existing scenes API with `mode: 'free'`
- `onRefresh` callback reloads the page via `window.location.reload()` (matches existing pattern)

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/components/scene/FreeSceneList.tsx
git commit -m "feat: add FreeSceneList component for free mode"
```

---

## Task 11: Wire Free Mode into Project Detail Page

**Files:**
- Modify: `hello-nextjs/src/app/projects/[id]/page.tsx` (~line 140-190, the stage rendering section)
- Modify: `hello-nextjs/src/components/project/ModeSelector.tsx` (if needed for callback wiring)

**Step 1: Add mode state and toggle**

At the top of the page component, add mode state. Read the current mode from the first scene's `mode` field (or default to `"story"`).

Add the `ModeSelector` component above the stage indicator. When the mode changes:
- Update all scenes' mode via a new API call (or batch update)
- Re-render the page

**Step 2: Conditional rendering**

In the stage rendering section (~line 156-186), wrap the existing switch statement:

```typescript
{mode === "free" ? (
  <FreeSceneList projectId={project.id} scenes={scenesWithMedia} />
) : (
  // existing stage-based rendering
  <>
    {project.stage === "draft" && <DraftStageView projectId={project.id} />}
    {project.stage === "scenes" && <SceneDescriptionList ... />}
    {/* ... etc */}
  </>
)}
```

Since the page is a server component and `ModeSelector` needs client interactivity, extract a client component wrapper `ProjectDetailClient` that handles the mode toggle and conditionally renders either Free Mode or Story Mode content.

**Step 3: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors. The project detail page renders the mode selector. Toggling to Free Mode shows `FreeSceneList`.

**Step 4: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/app/projects/[id]/page.tsx hello-nextjs/src/components/
git commit -m "feat: wire Free Mode toggle into project detail page"
```

---

## Task 12: Add Scene API for Free Mode

**Files:**
- Modify: `hello-nextjs/src/app/api/scenes/` (add a POST route if one doesn't exist, or modify existing)

Free Mode needs the ability to add individual scenes to a project (the existing flow only creates scenes via LLM batch generation).

**Step 1: Create or update the scenes creation route**

Create `hello-nextjs/src/app/api/scenes/route.ts` with a POST handler:

```typescript
// POST /api/scenes — create a single scene for free mode
export async function POST(request: Request) {
  // Auth check
  // Validate: projectId, description (optional), mode: "free"
  // Get max order_index for project, set new scene's order_index = max + 1
  // Insert scene with mode: "free", description_confirmed: true (free mode doesn't need confirmation)
  // Return created scene
}
```

**Step 2: Verify**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: No errors.

**Step 3: Commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add hello-nextjs/src/app/api/scenes/
git commit -m "feat: add POST /api/scenes for free mode scene creation"
```

---

## Task 13: End-to-End Verification

**Files:** None (verification only)

**Step 1: Lint and build**

Run: `cd hello-nextjs && npm run lint && npm run build`
Expected: Zero errors, zero warnings.

**Step 2: Review all new/modified files**

Check that:
- All imports resolve
- No unused imports or variables
- TypeScript types are correct
- API routes follow existing auth + ownership verification patterns
- Components follow existing patterns (client directive, Tailwind classes, dark mode)

**Step 3: Manual verification checklist**

- [ ] Mode selector renders on project detail page
- [ ] Toggling to Free Mode shows FreeSceneList
- [ ] Story Mode still works unchanged
- [ ] MaterialsPanel renders with upload buttons
- [ ] NaturalLanguageInput accepts text and shows loading state
- [ ] VideoContinueMenu shows dropdown with correct options
- [ ] All three new API routes respond (text gen, frame extract, video continue)

**Step 4: Final commit**

```bash
cd /Users/davendrapatel/a-video-seedance/ai-video-seedance
git add .
git commit -m "feat: complete Free Mode with materials, NL input, and video chaining"
```

---

## Task Dependency Graph

```
Task 1 (text gen API) ──────────────────┐
Task 2 (frame extract API) ─── Task 3 ──┤
Task 4 (volc-video materials) ─ Task 5 ──┤
                                         ├── Task 9 (FreeSceneCard) ── Task 10 (FreeSceneList) ── Task 11 (wire into page)
Task 6 (MaterialsPanel) ────────────────┤                                                              │
Task 7 (NaturalLanguageInput) ──────────┤                                                              │
Task 8 (VideoContinueMenu) ────────────┘                                                              │
                                                                                          Task 12 (add scene API)
                                                                                                       │
                                                                                          Task 13 (verification)
```

Tasks 1-8 can be done in parallel (they're independent). Tasks 9-10 depend on 6-8. Task 11 depends on 10. Task 12 can be done anytime. Task 13 is last.

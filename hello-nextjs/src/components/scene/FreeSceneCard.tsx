"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import MaterialsPanel from "./MaterialsPanel";
import NaturalLanguageInput from "@/components/materials/NaturalLanguageInput";
import VideoContinueMenu from "./VideoContinueMenu";
import { useSignedUrls } from "@/hooks/useSignedUrls";
import type { Scene, Image as ImageType, Video, Material } from "@/types/database";

interface SceneVideo {
  sceneId: string;
  sceneIndex: number;
  videoId: string;
}

interface FreeSceneCardProps {
  scene: Scene & { images: ImageType[]; videos: Video[] };
  projectId: string;
  materials: Material[];
  otherSceneVideos: SceneVideo[];
  onDescriptionChange: (sceneId: string, description: string) => void;
  onMaterialsChange: () => void;
  onGenerateVideo: (sceneId: string) => Promise<void>;
  onContinueStart: () => void;
}

export function FreeSceneCard({
  scene,
  projectId,
  materials,
  otherSceneVideos,
  onDescriptionChange,
  onMaterialsChange,
  onGenerateVideo,
  onContinueStart,
}: FreeSceneCardProps) {
  const [description, setDescription] = useState(scene.description);
  const [isGenerating, setIsGenerating] = useState(false);

  const latestImage = scene.images[0];
  const latestVideo = scene.videos[0];

  const storagePaths = useMemo(() => {
    const paths: string[] = [];
    if (latestImage?.storage_path) paths.push(latestImage.storage_path);
    if (latestVideo?.storage_path) paths.push(latestVideo.storage_path);
    return paths;
  }, [latestImage, latestVideo]);

  const { urls: signedUrls } = useSignedUrls({ paths: storagePaths });

  const imageUrl = latestImage?.storage_path
    ? signedUrls[latestImage.storage_path]
    : latestImage?.url;
  const videoUrl = latestVideo?.storage_path
    ? signedUrls[latestVideo.storage_path]
    : latestVideo?.url;

  const handleDescriptionBlur = useCallback(() => {
    if (description !== scene.description) {
      onDescriptionChange(scene.id, description);
    }
  }, [description, scene.description, scene.id, onDescriptionChange]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      await onGenerateVideo(scene.id);
    } catch (error) {
      console.error("Failed to generate video:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [scene.id, onGenerateVideo]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Preview Area */}
      <div className="relative aspect-video w-full bg-zinc-800">
        {videoUrl ? (
          <video
            src={videoUrl}
            className="h-full w-full object-cover"
            controls
            muted
          />
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt={`Scene ${scene.order_index + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {scene.video_status === "processing" ? (
              <div className="flex flex-col items-center gap-2">
                <svg
                  className="h-8 w-8 animate-spin text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-zinc-500">Generating...</span>
              </div>
            ) : (
              <span className="text-sm text-zinc-600">No media yet</span>
            )}
          </div>
        )}

        {/* Scene Number */}
        <div className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white">
          {scene.order_index + 1}
        </div>

        {/* Status Badge */}
        {scene.video_status !== "pending" && (
          <div
            className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs font-medium ${
              scene.video_status === "processing"
                ? "bg-blue-100 text-blue-700"
                : scene.video_status === "completed"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {scene.video_status === "processing"
              ? "Generating"
              : scene.video_status === "completed"
                ? "Completed"
                : "Failed"}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Describe this scene..."
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />

        {/* NL Input */}
        <NaturalLanguageInput
          sceneId={scene.id}
          projectId={projectId}
          onMaterialsChange={onMaterialsChange}
        />

        {/* Materials Panel */}
        <MaterialsPanel
          sceneId={scene.id}
          materials={materials}
          onMaterialsChange={onMaterialsChange}
        />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {(scene.video_status === "pending" ||
            scene.video_status === "failed" ||
            scene.video_status === "completed") &&
            scene.image_status === "completed" && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
              >
                {isGenerating ? "Starting..." : scene.video_status === "completed" ? "Regenerate" : "Generate Video"}
              </button>
            )}

          {latestVideo && scene.video_status === "completed" && (
            <VideoContinueMenu
              currentSceneId={scene.id}
              currentVideoId={latestVideo.id}
              otherSceneVideos={otherSceneVideos}
              onContinueStart={onContinueStart}
              disabled={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

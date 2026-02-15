"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { FreeSceneCard } from "./FreeSceneCard";
import type { Scene, Image as ImageType, Video, Material } from "@/types/database";

type SceneWithMedia = Scene & { images: ImageType[]; videos: Video[] };

interface FreeSceneListProps {
  projectId: string;
  scenes: SceneWithMedia[];
}

export function FreeSceneList({ projectId, scenes }: FreeSceneListProps) {
  const [localScenes, setLocalScenes] = useState(scenes);
  const [materialsMap, setMaterialsMap] = useState<Record<string, Material[]>>({});
  const [isAddingScene, setIsAddingScene] = useState(false);

  // Fetch materials for all free scenes
  const fetchMaterials = useCallback(async () => {
    const sceneIds = localScenes.map((s) => s.id);
    if (sceneIds.length === 0) return;

    try {
      const results = await Promise.all(
        sceneIds.map(async (sceneId) => {
          const res = await fetch(`/api/materials?sceneId=${sceneId}`);
          if (!res.ok) return { sceneId, materials: [] };
          const data = await res.json();
          return { sceneId, materials: data.materials ?? [] };
        })
      );

      const map: Record<string, Material[]> = {};
      for (const { sceneId, materials } of results) {
        map[sceneId] = materials;
      }
      setMaterialsMap(map);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    }
  }, [localScenes]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Resume polling for processing videos
  useEffect(() => {
    localScenes.forEach((scene) => {
      if (scene.video_status === "processing" && scene.videos.length > 0) {
        const latestVideo = scene.videos[scene.videos.length - 1];
        if (latestVideo.task_id) {
          pollForVideoCompletion(scene.id, latestVideo.task_id, latestVideo.id);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build other-scene-videos lookup for cross-scene continuation
  const otherSceneVideosMap = useMemo(() => {
    const map: Record<string, Array<{ sceneId: string; sceneIndex: number; videoId: string }>> = {};
    for (const scene of localScenes) {
      map[scene.id] = localScenes
        .filter(
          (s) =>
            s.id !== scene.id &&
            s.video_status === "completed" &&
            s.videos.length > 0
        )
        .map((s) => ({
          sceneId: s.id,
          sceneIndex: s.order_index,
          videoId: s.videos[0].id,
        }));
    }
    return map;
  }, [localScenes]);

  const pollForVideoCompletion = async (
    sceneId: string,
    taskId: string,
    videoId: string
  ) => {
    const maxAttempts = 120;
    const interval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      try {
        const statusResponse = await fetch(
          `/api/generate/video/task/${taskId}?sceneId=${sceneId}&projectId=${projectId}&videoId=${videoId}`
        );
        if (!statusResponse.ok) continue;

        const statusData = await statusResponse.json();

        if (statusData.status === "completed") {
          const projectResponse = await fetch(`/api/projects/${projectId}`);
          if (projectResponse.ok) {
            const { project } = await projectResponse.json();
            const updatedScene = project.scenes.find(
              (s: SceneWithMedia) => s.id === sceneId
            );
            setLocalScenes((prev) =>
              prev.map((s) =>
                s.id === sceneId
                  ? { ...s, video_status: "completed", videos: updatedScene?.videos ?? [] }
                  : s
              )
            );
          } else {
            setLocalScenes((prev) =>
              prev.map((s) =>
                s.id === sceneId ? { ...s, video_status: "completed" } : s
              )
            );
          }
          return;
        }

        if (statusData.status === "failed") {
          setLocalScenes((prev) =>
            prev.map((s) =>
              s.id === sceneId ? { ...s, video_status: "failed" } : s
            )
          );
          return;
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    }
  };

  const handleDescriptionChange = useCallback(
    async (sceneId: string, description: string) => {
      try {
        const res = await fetch(`/api/scenes/${sceneId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });
        if (!res.ok) {
          console.error("Failed to update description");
        }
      } catch (error) {
        console.error("Failed to update description:", error);
      }
    },
    []
  );

  const handleGenerateVideo = useCallback(
    async (sceneId: string) => {
      const response = await fetch(`/api/generate/video/scene/${sceneId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to generate video");
      }

      const data = await response.json();

      setLocalScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId ? { ...s, video_status: "processing" } : s
        )
      );

      pollForVideoCompletion(sceneId, data.taskId, data.videoId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId]
  );

  const handleContinueStart = useCallback(
    () => {
      // Refresh project data to pick up the new continuation video
      const refreshProject = async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}`);
          if (res.ok) {
            const { project } = await res.json();
            setLocalScenes(project.scenes.filter((s: SceneWithMedia) => s.mode === "free"));
          }
        } catch (error) {
          console.error("Failed to refresh project:", error);
        }
      };
      refreshProject();
    },
    [projectId]
  );

  const handleAddScene = useCallback(async () => {
    setIsAddingScene(true);
    try {
      const res = await fetch("/api/scenes/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          description: "",
          orderIndex: localScenes.length,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Failed to add scene:", data.error);
        return;
      }

      const data = await res.json();
      const newScene: SceneWithMedia = {
        ...data.scene,
        images: [],
        videos: [],
      };
      setLocalScenes((prev) => [...prev, newScene]);
    } catch (error) {
      console.error("Failed to add scene:", error);
    } finally {
      setIsAddingScene(false);
    }
  }, [projectId, localScenes.length]);

  return (
    <div className="space-y-4">
      {/* Scene count */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">
          {localScenes.length} scene{localScenes.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={handleAddScene}
          disabled={isAddingScene}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
        >
          {isAddingScene ? "Adding..." : "+ Add Scene"}
        </button>
      </div>

      {/* Scene Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {localScenes.map((scene) => (
          <FreeSceneCard
            key={scene.id}
            scene={scene}
            projectId={projectId}
            materials={materialsMap[scene.id] ?? []}
            otherSceneVideos={otherSceneVideosMap[scene.id] ?? []}
            onDescriptionChange={handleDescriptionChange}
            onMaterialsChange={fetchMaterials}
            onGenerateVideo={handleGenerateVideo}
            onContinueStart={handleContinueStart}
          />
        ))}
      </div>

      {localScenes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-700 py-12 text-center">
          <span className="text-sm text-zinc-500">
            No scenes yet. Add your first scene to get started.
          </span>
          <button
            onClick={handleAddScene}
            disabled={isAddingScene}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isAddingScene ? "Adding..." : "Add First Scene"}
          </button>
        </div>
      )}
    </div>
  );
}

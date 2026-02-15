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

  const getDisplayName = (material: Material): string => {
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
    if (
      material.metadata &&
      typeof material.metadata === "object" &&
      "originalName" in material.metadata
    ) {
      return String(
        (material.metadata as Record<string, unknown>).originalName
      );
    }
    return material.type;
  };

  return (
    <div className="border border-zinc-700 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg"
      >
        <span>
          Materials
          {materials.length > 0 && (
            <span className="ml-1 rounded-full bg-zinc-700 px-2 py-0.5 text-xs">
              {materials.length}
            </span>
          )}
        </span>
        <span className="text-xs">{isOpen ? "\u25B2" : "\u25BC"}</span>
      </button>

      {isOpen && (
        <div className="border-t border-zinc-700 px-3 py-2 space-y-2">
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
                  {getDisplayName(mat)}
                </span>
              </div>
              <button
                onClick={() => handleDelete(mat.id)}
                className="ml-2 shrink-0 text-zinc-500 hover:text-red-400 text-xs"
              >
                x
              </button>
            </div>
          ))}

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

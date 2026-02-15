"use client";

import { useState, useCallback, useRef } from "react";
import type { Material, material_type } from "@/types/database";

interface ReferenceUploaderProps {
  sceneId: string;
  materials: Material[];
  onMaterialsChange: () => void;
}

const LIMITS: Record<string, number> = {
  image: 9,
  video: 3,
  audio: 3,
};

const EXTENSION_TO_TYPE: Record<string, material_type> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
};

const ACCEPT_ALL =
  "image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4";

function getTypeFromFile(filename: string): material_type | null {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_TO_TYPE[ext] || null;
}

function getDisplayName(material: Material): string {
  if (
    material.metadata &&
    typeof material.metadata === "object" &&
    "originalName" in material.metadata
  ) {
    return String((material.metadata as Record<string, unknown>).originalName);
  }
  return material.storage_path.split("/").pop() || material.type;
}

export default function ReferenceUploader({
  sceneId,
  materials,
  onMaterialsChange,
}: ReferenceUploaderProps) {
  const [isOpen, setIsOpen] = useState(materials.length > 0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageCount = materials.filter((m) => m.type === "image").length;
  const videoCount = materials.filter((m) => m.type === "video").length;
  const audioCount = materials.filter((m) => m.type === "audio").length;

  const getSummary = () => {
    const parts: string[] = [];
    if (imageCount > 0) parts.push(`${imageCount} image${imageCount > 1 ? "s" : ""}`);
    if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);
    if (audioCount > 0) parts.push(`${audioCount} audio`);
    return parts.length > 0 ? parts.join(", ") : "None";
  };

  const handleUpload = useCallback(
    async (file: File) => {
      const type = getTypeFromFile(file.name);
      if (!type) {
        setError(`Unsupported file type: ${file.name}`);
        return;
      }

      const currentCount = materials.filter((m) => m.type === type).length;
      const limit = LIMITS[type];
      if (currentCount >= limit) {
        setError(`Limit reached: max ${limit} ${type} files`);
        return;
      }

      setUploading(true);
      setUploadProgress(`Uploading ${file.name}...`);
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
        setUploadProgress(null);
      }
    },
    [sceneId, materials, onMaterialsChange]
  );

  const handleDelete = useCallback(
    async (materialId: string) => {
      setDeletingId(materialId);
      setError(null);
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
      } finally {
        setDeletingId(null);
      }
    },
    [onMaterialsChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleUpload]
  );

  const images = materials.filter((m) => m.type === "image");
  const videos = materials.filter((m) => m.type === "video");
  const audios = materials.filter((m) => m.type === "audio");

  const renderMaterialItem = (material: Material) => {
    const isDeleting = deletingId === material.id;
    return (
      <div
        key={material.id}
        className="group relative flex items-center gap-2 rounded bg-zinc-800 p-1.5"
      >
        {material.type === "image" ? (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={material.url}
              alt={getDisplayName(material)}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-700">
            {material.type === "video" ? (
              <svg
                className="h-5 w-5 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            )}
          </div>
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
          {getDisplayName(material)}
        </span>
        <button
          onClick={() => handleDelete(material.id)}
          disabled={isDeleting}
          className="shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-700 hover:text-red-400 disabled:opacity-50"
          title="Remove"
        >
          {isDeleting ? (
            <svg
              className="h-3.5 w-3.5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      </div>
    );
  };

  const renderSection = (
    label: string,
    type: string,
    items: Material[],
    limit: number
  ) => {
    if (items.length === 0 && imageCount + videoCount + audioCount === 0) return null;
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            {label} ({items.length}/{limit})
          </span>
        </div>
        {items.length > 0 ? (
          <div
            className={
              type === "image"
                ? "grid grid-cols-3 gap-1.5"
                : "flex flex-col gap-1.5"
            }
          >
            {items.map(renderMaterialItem)}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-zinc-700">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
          <span>Reference Materials</span>
          {materials.length > 0 && (
            <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
              {getSummary()}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="space-y-3 border-t border-zinc-700 px-3 py-3">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-3 transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-500/10"
                : "border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800/50"
            }`}
          >
            <svg
              className={`h-5 w-5 ${dragOver ? "text-blue-400" : "text-zinc-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-xs text-zinc-400">
              Drop file here or click to browse
            </span>
            <span className="text-[10px] text-zinc-600">
              Images, videos, or audio files
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ALL}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Upload progress */}
          {uploading && uploadProgress && (
            <div className="flex items-center gap-2 rounded bg-zinc-800 px-2.5 py-1.5">
              <svg
                className="h-3.5 w-3.5 animate-spin text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-xs text-zinc-400">{uploadProgress}</span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center justify-between rounded bg-red-900/20 px-2.5 py-1.5">
              <span className="text-xs text-red-400">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-2 text-xs text-red-500 hover:text-red-400"
              >
                dismiss
              </button>
            </div>
          )}

          {/* Material sections */}
          {renderSection("Images", "image", images, LIMITS.image)}
          {renderSection("Videos", "video", videos, LIMITS.video)}
          {renderSection("Audio", "audio", audios, LIMITS.audio)}

          {/* Limits hint when empty */}
          {materials.length === 0 && (
            <div className="text-center text-[10px] text-zinc-600">
              Limits: 9 images, 3 videos, 3 audio
            </div>
          )}
        </div>
      )}
    </div>
  );
}

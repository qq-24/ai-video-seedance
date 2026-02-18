"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { Material } from "@prisma/client";

interface MaterialCardProps {
  material: Material;
  onDelete?: () => void;
  onReorder?: (dragIndex: number, hoverIndex: number) => void;
  index: number;
  isDeleting?: boolean;
}

const MATERIAL_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  audio: {
    label: "音频",
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    ),
  },
  video: {
    label: "视频",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  image: {
    label: "图片",
    color: "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  text: {
    label: "文本",
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
};

function getTextPreview(metadata: Material["metadata"]): string {
  if (!metadata || typeof metadata !== "object") return "";
  const meta = metadata as Record<string, unknown>;
  if (typeof meta.content === "string") {
    return meta.content.length > 100 ? meta.content.slice(0, 100) + "..." : meta.content;
  }
  if (typeof meta.originalName === "string") {
    return meta.originalName;
  }
  return "文本素材";
}

function getFileName(material: Material): string {
  if (material.metadata && typeof material.metadata === "object") {
    const meta = material.metadata as Record<string, unknown>;
    if (typeof meta.originalName === "string") {
      return meta.originalName;
    }
  }
  const parts = material.storagePath.split("/");
  return parts[parts.length - 1] || "未知文件";
}

export function MaterialCard({
  material,
  onDelete,
  onReorder,
  index,
  isDeleting = false,
}: MaterialCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const config = MATERIAL_TYPE_CONFIG[material.type] || {
    label: material.type,
    color: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400",
    icon: null,
  };

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      console.log("[MaterialCard] Drag start, index:", index, "materialId:", material.id);
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
    },
    [index, material.id]
  );

  const handleDragEnd = useCallback(() => {
    console.log("[MaterialCard] Drag end");
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const dragIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (dragIndex !== index && onReorder) {
        console.log("[MaterialCard] Drop, dragIndex:", dragIndex, "hoverIndex:", index);
        onReorder(dragIndex, index);
      }
    },
    [index, onReorder]
  );

  const handleDelete = useCallback(() => {
    if (onDelete && !isDeleting) {
      console.log("[MaterialCard] Delete requested for material:", material.id);
      onDelete();
    }
  }, [onDelete, isDeleting, material.id]);

  const renderPreview = () => {
    switch (material.type) {
      case "image":
        return (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Image
              src={material.url}
              alt={getFileName(material)}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 300px"
              unoptimized
            />
          </div>
        );

      case "video":
        return (
          <div
            className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
            onClick={() => setShowVideoPreview(!showVideoPreview)}
          >
            {showVideoPreview ? (
              <video
                src={material.url}
                className="h-full w-full object-cover"
                controls
                autoPlay
              />
            ) : (
              <>
                <video
                  src={material.url}
                  className="h-full w-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg">
                    <svg className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "audio":
        return (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
            <div className={`rounded-full p-3 ${config.color}`}>{config.icon}</div>
            <audio src={material.url} controls className="w-full" preload="metadata" />
          </div>
        );

      case "text":
        return (
          <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {getTextPreview(material.metadata)}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={dragRef}
      draggable={!!onReorder}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`group relative rounded-xl border bg-white transition-all dark:bg-zinc-900 ${
        isDragging
          ? "border-blue-400 shadow-lg ring-2 ring-blue-400/50"
          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
      } ${isDeleting ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3 p-4">
        {onReorder && (
          <div
            className="mt-1 cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing dark:text-zinc-500 dark:hover:text-zinc-300"
            title="拖拽排序"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${config.color}`}>
              {config.icon}
              <span>{config.label}</span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              #{index + 1}
            </span>
          </div>

          {renderPreview()}

          <div className="mt-2 flex items-center justify-between">
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={getFileName(material)}>
              {getFileName(material)}
            </p>
            {material.metadata && typeof material.metadata === "object" && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {(material.metadata as Record<string, unknown>).size
                  ? `${Math.round(Number((material.metadata as Record<string, unknown>).size) / 1024)} KB`
                  : ""}
              </span>
            )}
          </div>
        </div>

        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            title="删除素材"
          >
            {isDeleting ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

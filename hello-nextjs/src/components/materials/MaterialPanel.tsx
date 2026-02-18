"use client";

import { useState, useCallback } from "react";
import { MaterialCard } from "./MaterialCard";
import { MaterialUploader } from "./MaterialUploader";
import type { Material } from "@/types/database";

interface MaterialPanelProps {
  sceneId: string;
  materials: Material[];
  onRefresh: () => void;
}

export function MaterialPanel({ sceneId, materials, onRefresh }: MaterialPanelProps) {
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (materialId: string) => {
      console.log("[MaterialPanel] Deleting material:", materialId);
      setDeletingId(materialId);

      try {
        const response = await fetch("/api/materials", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ materialId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "删除失败");
        }

        console.log("[MaterialPanel] Material deleted successfully:", materialId);
        onRefresh();
      } catch (error) {
        console.error("[MaterialPanel] Error deleting material:", error);
        alert(error instanceof Error ? error.message : "删除失败");
      } finally {
        setDeletingId(null);
      }
    },
    [onRefresh]
  );

  const handleReorder = useCallback(
    async (dragIndex: number, hoverIndex: number) => {
      console.log("[MaterialPanel] Reordering materials:", dragIndex, "->", hoverIndex);

      const newMaterials = [...materials];
      const [draggedItem] = newMaterials.splice(dragIndex, 1);
      newMaterials.splice(hoverIndex, 0, draggedItem);

      try {
        const updatePromises = newMaterials.map((material, index) =>
          fetch(`/api/materials/${material.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ order_index: index }),
          })
        );

        await Promise.all(updatePromises);
        console.log("[MaterialPanel] Reorder completed successfully");
        onRefresh();
      } catch (error) {
        console.error("[MaterialPanel] Error reordering materials:", error);
        alert("排序更新失败");
      }
    },
    [materials, onRefresh]
  );

  const handleUploadComplete = useCallback(() => {
    console.log("[MaterialPanel] Upload complete, refreshing materials");
    setIsUploaderOpen(false);
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            素材库
          </h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {materials.length}
          </span>
        </div>

        <button
          onClick={() => setIsUploaderOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          添加素材
        </button>
      </div>

      {materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-12 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="mb-4 rounded-full bg-zinc-200 p-4 dark:bg-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-400 dark:text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            暂无素材
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            点击上方按钮添加素材，或使用自然语言生成
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((material, index) => (
              <MaterialCard
                key={material.id}
                material={material}
                index={index}
                onDelete={() => handleDelete(material.id)}
                onReorder={handleReorder}
                isDeleting={deletingId === material.id}
              />
            ))}
        </div>
      )}

      <MaterialUploader
        sceneId={sceneId}
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}

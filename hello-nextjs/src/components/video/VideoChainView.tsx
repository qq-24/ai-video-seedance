"use client";

import { useState } from "react";
import Image from "next/image";
import type { VideoChainItem, Video } from "@/types/database";

export interface VideoChainViewProps {
  chainId: string;
  items: (VideoChainItem & { video: Video })[];
  onRegenerateItem?: (itemId: string) => void;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function calculateTotalDuration(items: (VideoChainItem & { video: Video })[]): number {
  return items.reduce((total, item) => total + (item.video.duration ?? 0), 0);
}

export function VideoChainView({
  chainId,
  items,
  onRegenerateItem,
}: VideoChainViewProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  console.log("[VideoChainView] Rendering chain:", chainId, "items:", items?.length ?? 0);

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <svg
          className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600"
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
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          暂无视频链数据
        </p>
      </div>
    );
  }

  const totalDuration = calculateTotalDuration(items);

  const handleRegenerate = async (itemId: string) => {
    if (!onRegenerateItem) return;

    console.log("[VideoChainView] Regenerating item:", itemId);
    setIsRegenerating(itemId);
    try {
      await onRegenerateItem(itemId);
      console.log("[VideoChainView] Item regenerated successfully:", itemId);
    } catch (error) {
      console.error("[VideoChainView] Failed to regenerate item:", error);
    } finally {
      setIsRegenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          视频链
        </h3>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          共 {items.length} 个视频 · 总时长 {formatDuration(totalDuration)}
        </span>
      </div>

      <div className="flex flex-wrap gap-4">
        {items.map((item, index) => {
          const { video } = item;
          const isSelected = selectedItemId === item.id;
          const isItemRegenerating = isRegenerating === item.id;
          const isLastItem = index === items.length - 1;

          return (
            <div key={item.id} className="flex items-center gap-4">
              <div
                className={`relative w-48 overflow-hidden rounded-xl border transition-all ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
                onClick={() => setSelectedItemId(item.id)}
              >
                <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
                  {video.url ? (
                    <video
                      src={video.url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        className="h-8 w-8 text-zinc-300 dark:text-zinc-600"
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
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white">
                    {index + 1}
                  </div>

                  {video.duration && (
                    <div className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>

                {onRegenerateItem && (
                  <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerate(item.id);
                      }}
                      disabled={isItemRegenerating}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      {isItemRegenerating ? (
                        <>
                          <svg
                            className="h-3 w-3 animate-spin"
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
                          重新生成中...
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          重新生成
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!isLastItem && (
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-zinc-400 dark:text-zinc-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedItemId && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            已选中第 {items.findIndex((i) => i.id === selectedItemId) + 1} 个视频
          </p>
        </div>
      )}
    </div>
  );
}

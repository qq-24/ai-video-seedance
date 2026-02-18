"use client";

import { useState, useCallback } from "react";

export interface ContinueVideoButtonProps {
  sceneId: string;
  parentVideoId: string;
  onContinue?: (description: string) => void | Promise<void>;
  disabled?: boolean;
}

interface ContinueVideoResponse {
  success: boolean;
  taskId: string;
  videoId: string;
  chainItemId: string;
  message?: string;
}

export function ContinueVideoButton({
  sceneId,
  parentVideoId,
  onContinue,
  disabled = false,
}: ContinueVideoButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log("[ContinueVideoButton] Rendering for scene:", sceneId, "parent:", parentVideoId);

  const handleOpenModal = useCallback(() => {
    console.log("[ContinueVideoButton] Opening modal");
    setShowModal(true);
    setDescription("");
    setError(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    console.log("[ContinueVideoButton] Closing modal");
    setShowModal(false);
    setDescription("");
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      setError("请输入动作描述");
      return;
    }

    console.log("[ContinueVideoButton] Submitting continuation request:", {
      sceneId,
      parentVideoId,
      description: description.substring(0, 50),
    });

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/generate/video/continue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sceneId,
          parentVideoId,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[ContinueVideoButton] API error:", data);
        throw new Error(data.error || "接续生成失败");
      }

      console.log("[ContinueVideoButton] Continuation task created:", data);

      if (onContinue) {
        await onContinue(description.trim());
      }

      setShowModal(false);
      setDescription("");
    } catch (err) {
      console.error("[ContinueVideoButton] Error:", err);
      setError(err instanceof Error ? err.message : "接续生成失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [description, sceneId, parentVideoId, onContinue]);

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          className="h-4 w-4"
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
        接续生成
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                接续生成视频
              </h3>
              <button
                onClick={handleCloseModal}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              输入新视频的动作描述，系统将使用上一个视频的最后一帧作为起始画面。
            </p>

            <div className="mb-4">
              <label
                htmlFor="continue-description"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                动作描述
              </label>
              <textarea
                id="continue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：人物向前走动，背景逐渐变化..."
                rows={3}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !description.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    生成中...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
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
                    开始生成
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

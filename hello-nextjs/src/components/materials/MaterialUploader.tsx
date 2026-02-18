"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { material_type } from "@/types/database";

interface MaterialUploaderProps {
  sceneId: string;
  onUploadComplete: () => void;
  isOpen: boolean;
  onClose: () => void;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

const FILE_TYPE_OPTIONS: { value: material_type; label: string; extensions: string[] }[] = [
  { value: "image", label: "图片", extensions: ["png", "jpg", "jpeg", "webp"] },
  { value: "video", label: "视频", extensions: ["mp4", "mov", "webm"] },
  { value: "audio", label: "音频", extensions: ["mp3", "wav", "m4a"] },
  { value: "text", label: "文本", extensions: ["txt", "md", "json"] },
];

const MAX_FILE_SIZES: Record<material_type, number> = {
  image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  text: 1 * 1024 * 1024,
};

export function MaterialUploader({
  sceneId,
  onUploadComplete,
  isOpen,
  onClose,
}: MaterialUploaderProps) {
  const [selectedType, setSelectedType] = useState<material_type>("image");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log("[MaterialUploader] Modal isOpen:", isOpen, "sceneId:", sceneId);
  }, [isOpen, sceneId]);

  const resetState = useCallback(() => {
    console.log("[MaterialUploader] Resetting state");
    setFiles([]);
    setUploadProgress([]);
    setIsUploading(false);
    setIsDragging(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      resetState();
      onClose();
    }
  }, [isUploading, resetState, onClose]);

  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      const typeConfig = FILE_TYPE_OPTIONS.find((t) => t.value === selectedType);
      if (!typeConfig) {
        return { valid: false, error: "未知的文件类型" };
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (!typeConfig.extensions.includes(extension)) {
        return {
          valid: false,
          error: `不支持的文件格式，支持: ${typeConfig.extensions.join(", ")}`,
        };
      }

      const maxSize = MAX_FILE_SIZES[selectedType];
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `文件大小超过限制 (最大 ${Math.round(maxSize / 1024 / 1024)}MB)`,
        };
      }

      return { valid: true };
    },
    [selectedType]
  );

  const handleFileSelect = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;

      console.log("[MaterialUploader] Files selected:", newFiles.length);

      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      Array.from(newFiles).forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          invalidFiles.push(`${file.name}: ${validation.error}`);
        }
      });

      if (invalidFiles.length > 0) {
        console.warn("[MaterialUploader] Invalid files:", invalidFiles);
        alert(`部分文件无法添加:\n${invalidFiles.join("\n")}`);
      }

      setFiles((prev) => [...prev, ...validFiles]);
    },
    [validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removeFile = useCallback((index: number) => {
    console.log("[MaterialUploader] Removing file at index:", index);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFile = useCallback(
    async (file: File): Promise<{ success: boolean; error?: string }> => {
      console.log("[MaterialUploader] Uploading file:", file.name);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("sceneId", sceneId);
      formData.append("type", selectedType);

      try {
        const response = await fetch("/api/materials/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `上传失败 (${response.status})`);
        }

        console.log("[MaterialUploader] File uploaded successfully:", file.name);
        return { success: true };
      } catch (error) {
        console.error("[MaterialUploader] Upload error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "上传失败",
        };
      }
    },
    [sceneId, selectedType]
  );

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      console.log("[MaterialUploader] No files to upload");
      return;
    }

    console.log("[MaterialUploader] Starting upload for", files.length, "files");
    setIsUploading(true);

    const progressList: UploadProgress[] = files.map((file) => ({
      fileName: file.name,
      progress: 0,
      status: "pending" as const,
    }));
    setUploadProgress(progressList);

    for (let i = 0; i < files.length; i++) {
      setUploadProgress((prev) =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: "uploading", progress: 50 } : p
        )
      );

      const result = await uploadFile(files[i]);

      setUploadProgress((prev) =>
        prev.map((p, idx) =>
          idx === i
            ? {
                ...p,
                status: result.success ? "success" : "error",
                progress: 100,
                error: result.error,
              }
            : p
        )
      );
    }

    console.log("[MaterialUploader] All uploads completed");
    setIsUploading(false);

    const allSuccess = uploadProgress.every((p) => p.status === "success");
    if (allSuccess) {
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 500);
    }
  }, [files, uploadFile, onUploadComplete, handleClose, uploadProgress]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            上传素材
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            素材类型
          </label>
          <div className="flex flex-wrap gap-2">
            {FILE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  console.log("[MaterialUploader] Type selected:", option.value);
                  setSelectedType(option.value);
                  setFiles([]);
                }}
                disabled={isUploading}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedType === option.value
                    ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                } disabled:opacity-50`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            支持: {FILE_TYPE_OPTIONS.find((t) => t.value === selectedType)?.extensions.join(", ")}
            {" | 最大: "}
            {Math.round(MAX_FILE_SIZES[selectedType] / 1024 / 1024)}MB
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
              : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_TYPE_OPTIONS.find((t) => t.value === selectedType)?.extensions
              .map((ext) => `.${ext}`)
              .join(",")}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <svg
            className="mb-2 h-10 w-10 text-zinc-400 dark:text-zinc-500"
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
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            点击或拖拽文件到此处
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            支持多文件上传
          </p>
        </div>

        {files.length > 0 && (
          <div className="mb-4 max-h-40 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800"
              >
                <div className="flex-1 truncate">
                  <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-2 rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {uploadProgress.length > 0 && (
          <div className="mb-4 space-y-2">
            {uploadProgress.map((progress, index) => (
              <div
                key={`${progress.fileName}-${index}`}
                className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {progress.fileName}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      progress.status === "success"
                        ? "text-green-600 dark:text-green-400"
                        : progress.status === "error"
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {progress.status === "success"
                      ? "完成"
                      : progress.status === "error"
                      ? "失败"
                      : progress.status === "uploading"
                      ? "上传中..."
                      : "等待中"}
                  </span>
                </div>
                {progress.status === "uploading" && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                )}
                {progress.error && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {progress.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
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
                上传中...
              </span>
            ) : (
              `上传 ${files.length > 0 ? `(${files.length})` : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

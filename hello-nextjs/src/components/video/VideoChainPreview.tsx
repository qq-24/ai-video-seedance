"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { VideoChainItem, Video } from "@/types/database";

export interface VideoChainPreviewProps {
  chainId: string;
  items: (VideoChainItem & { video: Video })[];
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

export function VideoChainPreview({
  chainId,
  items,
}: VideoChainPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const totalDuration = calculateTotalDuration(items);
  const validItems = items.filter((item) => item.video.url);

  console.log("[VideoChainPreview] Rendering for chain:", chainId, "valid items:", validItems.length);

  useEffect(() => {
    if (validItems.length === 0) return;

    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      console.log("[VideoChainPreview] Video loaded, index:", currentVideoIndex);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      console.log("[VideoChainPreview] Video ended, current index:", currentVideoIndex);
      if (currentVideoIndex < validItems.length - 1) {
        setCurrentVideoIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentVideoIndex(0);
        setCurrentTime(0);
      }
    };

    const handleError = () => {
      console.error("[VideoChainPreview] Video error for index:", currentVideoIndex);
      setIsLoading(false);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [currentVideoIndex, validItems.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || validItems.length === 0) return;

    const currentVideo = validItems[currentVideoIndex]?.video;
    if (!currentVideo?.url) return;

    console.log("[VideoChainPreview] Switching to video:", currentVideoIndex, currentVideo.url);
    video.src = currentVideo.url;
    video.load();

    if (isPlaying) {
      video.play().catch((err) => {
        console.error("[VideoChainPreview] Play error:", err);
      });
    }
  }, [currentVideoIndex, validItems, isPlaying]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || validItems.length === 0) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      console.log("[VideoChainPreview] Paused");
    } else {
      video.play().catch((err) => {
        console.error("[VideoChainPreview] Play error:", err);
      });
      setIsPlaying(true);
      console.log("[VideoChainPreview] Playing");
    }
  }, [isPlaying, validItems.length]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
    console.log("[VideoChainPreview] Seek to:", seekTime);
  }, []);

  const handleVideoClick = useCallback(() => {
    togglePlayPause();
  }, [togglePlayPause]);

  if (!validItems || validItems.length === 0) {
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
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          暂无可预览的视频
        </p>
      </div>
    );
  }

  const currentVideo = validItems[currentVideoIndex]?.video;
  const currentVideoDuration = currentVideo?.duration ?? 0;
  const progress = currentVideoDuration > 0 ? (currentTime / currentVideoDuration) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          className="h-full w-full cursor-pointer object-contain"
          onClick={handleVideoClick}
          playsInline
          muted
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <svg
              className="h-10 w-10 animate-spin text-white"
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
          </div>
        )}

        {!isPlaying && !isLoading && (
          <div
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
            onClick={handleVideoClick}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <svg
                className="ml-1 h-8 w-8 text-zinc-900"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-8">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            >
              {isPlaying ? (
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="ml-0.5 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="flex flex-1 flex-col gap-1">
              <input
                type="range"
                min="0"
                max={currentVideoDuration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(currentVideoDuration)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute right-3 top-3 rounded bg-black/50 px-2 py-1 text-xs text-white">
          {currentVideoIndex + 1} / {validItems.length}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200 p-3 dark:border-zinc-800">
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
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            视频链预览
          </span>
        </div>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          总时长: {formatDuration(totalDuration)}
        </span>
      </div>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {validItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentVideoIndex(index);
                setCurrentTime(0);
                setIsPlaying(true);
              }}
              className={`flex h-12 w-20 flex-shrink-0 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                index === currentVideoIndex
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

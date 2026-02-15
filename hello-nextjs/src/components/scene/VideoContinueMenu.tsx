"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SceneVideo {
  sceneId: string;
  sceneIndex: number;
  videoId: string;
}

interface VideoContinueMenuProps {
  currentSceneId: string;
  currentVideoId?: string;
  otherSceneVideos: SceneVideo[];
  onContinueStart: () => void;
  disabled?: boolean;
}

export default function VideoContinueMenu({
  currentSceneId,
  currentVideoId,
  otherSceneVideos,
  onContinueStart,
  disabled,
}: VideoContinueMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleContinue = useCallback(
    async (parentVideoId: string, sceneId: string, description: string) => {
      setLoading(true);
      setError(null);
      setOpen(false);

      try {
        // First extract the last frame
        const frameRes = await fetch("/api/video/extract-frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: parentVideoId, sceneId }),
        });

        let lastFrameUrl: string | undefined;
        if (frameRes.ok) {
          const frameData = await frameRes.json();
          if (frameData.success && frameData.frameUrl) {
            lastFrameUrl = frameData.frameUrl;
          }
        }

        // Create continuation video
        const res = await fetch("/api/generate/video/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sceneId,
            parentVideoId,
            description,
            lastFrameUrl,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to start continuation");
        }

        await res.json();
        onContinueStart();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to continue video");
      } finally {
        setLoading(false);
      }
    },
    [onContinueStart]
  );

  if (!currentVideoId && otherSceneVideos.length === 0) {
    return null;
  }

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        className="rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
      >
        {loading ? "Starting..." : "Continue Video"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
          {currentVideoId && (
            <button
              onClick={() =>
                handleContinue(currentVideoId, currentSceneId, "Continue the motion naturally")
              }
              className="block w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Continue this scene
            </button>
          )}

          {otherSceneVideos.length > 0 && currentVideoId && (
            <div className="my-1 border-t border-zinc-700" />
          )}

          {otherSceneVideos.map((sv) => (
            <button
              key={sv.videoId}
              onClick={() =>
                handleContinue(sv.videoId, currentSceneId, "Continue from previous scene")
              }
              className="block w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Continue from Scene {sv.sceneIndex + 1}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

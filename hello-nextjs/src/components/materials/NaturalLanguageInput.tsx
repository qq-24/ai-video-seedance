"use client";

import { useState, useCallback } from "react";
import type { IntentType } from "@/types/ai";

interface NaturalLanguageInputProps {
  sceneId: string;
  projectId: string;
  onMaterialsChange: () => void;
  placeholder?: string;
}

type Status = "idle" | "parsing" | "generating" | "done" | "error";

const INTENT_LABELS: Record<IntentType, string> = {
  generate_image: "Generating image...",
  generate_text: "Generating text...",
  generate_video: "Generating video...",
  unknown: "Unknown intent",
};

export default function NaturalLanguageInput({
  sceneId,
  projectId,
  onMaterialsChange,
  placeholder = "Describe what you want to create...",
}: NaturalLanguageInputProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;

      setError(null);
      setStatus("parsing");
      setStatusMessage("Parsing intent...");

      try {
        // Step 1: Parse intent
        const intentRes = await fetch("/api/parse-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: trimmed }),
        });

        if (!intentRes.ok) {
          const data = await intentRes.json();
          throw new Error(data.error || "Failed to parse intent");
        }

        const { intent } = await intentRes.json();
        const intentType: IntentType = intent.type;

        if (intentType === "unknown") {
          setError("Could not understand the request. Try something like 'generate an image of a sunset' or 'write a poem about spring'.");
          setStatus("error");
          return;
        }

        // Step 2: Route to appropriate generation endpoint
        setStatus("generating");
        setStatusMessage(INTENT_LABELS[intentType]);

        if (intentType === "generate_text") {
          const res = await fetch("/api/generate/text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: trimmed, sceneId }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Text generation failed");
          }
        } else if (intentType === "generate_image") {
          const res = await fetch(`/api/generate/image/${sceneId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Image generation failed");
          }
        } else if (intentType === "generate_video") {
          const res = await fetch(`/api/generate/video/scene/${sceneId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Video generation failed");
          }
        }

        setStatus("done");
        setStatusMessage("Done!");
        setInput("");
        onMaterialsChange();

        // Reset status after a brief delay
        setTimeout(() => {
          setStatus("idle");
          setStatusMessage("");
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStatus("error");
      }
    },
    [input, sceneId, projectId, onMaterialsChange]
  );

  const isProcessing = status === "parsing" || status === "generating";

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isProcessing}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isProcessing ? "..." : "Send"}
        </button>
      </form>

      {statusMessage && status !== "error" && (
        <p className="text-xs text-zinc-400">{statusMessage}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

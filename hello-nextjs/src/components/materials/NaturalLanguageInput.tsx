"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { IntentType } from "@/types/ai";

interface NaturalLanguageInputProps {
  sceneId: string;
  onGenerateComplete?: () => void;
  placeholder?: string;
}

interface IntentResult {
  type: IntentType;
  description: string;
  confidence: number;
}

interface ParsedIntentResponse {
  success: boolean;
  intent: IntentResult;
}

interface GenerateResponse {
  success: boolean;
  message?: string;
  error?: string;
  image?: {
    id: string;
    url: string;
  };
  video?: {
    id: string;
    taskId: string;
  };
  text?: string;
}

const INTENT_LABELS: Record<IntentType, string> = {
  generate_image: "生成图片",
  generate_text: "生成文本",
  generate_video: "生成视频",
  unknown: "未知意图",
};

const INTENT_ICONS: Record<IntentType, React.ReactNode> = {
  generate_image: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  generate_text: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  generate_video: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  unknown: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

type Status = "idle" | "parsing" | "confirming" | "generating" | "success" | "error";

export function NaturalLanguageInput({
  sceneId,
  onGenerateComplete,
  placeholder = "输入自然语言描述，如：生成一张夕阳海滩图片",
}: NaturalLanguageInputProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [intent, setIntent] = useState<IntentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GenerateResponse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    console.log("[NaturalLanguageInput] Component mounted with sceneId:", sceneId);
  }, [sceneId]);

  const parseIntent = useCallback(async (text: string): Promise<IntentResult | null> => {
    console.log("[NaturalLanguageInput] Parsing intent for:", text.substring(0, 50));
    setStatus("parsing");
    setError(null);

    try {
      const response = await fetch("/api/parse-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data: ParsedIntentResponse = await response.json();
      console.log("[NaturalLanguageInput] Parsed intent:", JSON.stringify(data.intent));

      if (data.success && data.intent) {
        setIntent(data.intent);
        setStatus("confirming");
        return data.intent;
      } else {
        throw new Error("Failed to parse intent");
      }
    } catch (err) {
      console.error("[NaturalLanguageInput] Error parsing intent:", err);
      const errorMessage = err instanceof Error ? err.message : "意图识别失败";
      setError(errorMessage);
      setStatus("error");
      return null;
    }
  }, []);

  const generateContent = useCallback(async (
    intentType: IntentType,
    description: string
  ): Promise<GenerateResponse | null> => {
    console.log("[NaturalLanguageInput] Generating content, type:", intentType, "description:", description.substring(0, 50));
    setStatus("generating");
    setError(null);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = { sceneId };

      switch (intentType) {
        case "generate_image":
          endpoint = `/api/generate/material/image`;
          body = { sceneId, description };
          break;
        case "generate_text":
          endpoint = `/api/generate/text`;
          body = { sceneId, description };
          break;
        case "generate_video":
          endpoint = `/api/generate/video/scene/${sceneId}`;
          body = { sceneId };
          break;
        default:
          throw new Error("Unknown intent type");
      }

      console.log("[NaturalLanguageInput] Calling endpoint:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      console.log("[NaturalLanguageInput] Generation result:", JSON.stringify(data));
      setGeneratedResult(data);
      setStatus("success");

      if (onGenerateComplete) {
        onGenerateComplete();
      }

      return data;
    } catch (err) {
      console.error("[NaturalLanguageInput] Error generating content:", err);
      const errorMessage = err instanceof Error ? err.message : "生成失败";
      setError(errorMessage);
      setStatus("error");
      return null;
    }
  }, [sceneId, onGenerateComplete]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim()) {
      console.log("[NaturalLanguageInput] Empty input, skipping");
      return;
    }

    console.log("[NaturalLanguageInput] Submitting input:", input);
    const parsedIntent = await parseIntent(input.trim());

    if (parsedIntent && parsedIntent.type === "unknown") {
      setError("无法识别您的意图，请尝试更明确的描述");
      setStatus("error");
    }
  }, [input, parseIntent]);

  const handleConfirm = useCallback(async () => {
    if (!intent || intent.type === "unknown") {
      console.log("[NaturalLanguageInput] No valid intent to confirm");
      return;
    }

    console.log("[NaturalLanguageInput] User confirmed intent:", intent.type);
    await generateContent(intent.type, intent.description);
  }, [intent, generateContent]);

  const handleCancel = useCallback(() => {
    console.log("[NaturalLanguageInput] User cancelled");
    setIntent(null);
    setStatus("idle");
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    console.log("[NaturalLanguageInput] Resetting component");
    setInput("");
    setIntent(null);
    setError(null);
    setGeneratedResult(null);
    setStatus("idle");
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const isLoading = status === "parsing" || status === "generating";

  return (
    <div className="flex flex-col space-y-4">
      <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        自然语言输入
      </div>

      {status === "idle" || status === "parsing" ? (
        <div className="flex flex-col space-y-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={3}
              disabled={isLoading}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              title="发送"
            >
              {status === "parsing" ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      ) : null}

      {status === "confirming" && intent && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            意图识别结果
          </div>
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
              {INTENT_ICONS[intent.type]}
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {INTENT_LABELS[intent.type]}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {Math.round(intent.confidence * 100)}% 置信度
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {intent.description || input}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              确认生成
            </button>
          </div>
        </div>
      )}

      {status === "generating" && intent && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                正在{INTENT_LABELS[intent.type]}...
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                请稍候，这可能需要几秒钟
              </p>
            </div>
          </div>
        </div>
      )}

      {status === "success" && intent && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-1 text-sm font-medium text-green-800 dark:text-green-200">
                {INTENT_LABELS[intent.type]}成功
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                {generatedResult?.message || "内容已生成完成"}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              继续输入
            </button>
          </div>
        </div>
      )}

      {status === "error" && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-1 text-sm font-medium text-red-800 dark:text-red-200">
                操作失败
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              重试
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

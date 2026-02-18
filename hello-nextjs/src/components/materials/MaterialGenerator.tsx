"use client";

import { NaturalLanguageInput } from "./NaturalLanguageInput";

interface MaterialGeneratorProps {
  sceneId: string;
  onGenerateComplete: () => void;
}

export function MaterialGenerator({ sceneId, onGenerateComplete }: MaterialGeneratorProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <svg
            className="h-4 w-4 text-zinc-600 dark:text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            AI 素材生成
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            使用自然语言描述生成素材
          </p>
        </div>
      </div>

      <NaturalLanguageInput
        sceneId={sceneId}
        onGenerateComplete={onGenerateComplete}
        placeholder="描述您想要的素材，如：生成一张夕阳海滩的图片"
      />
    </div>
  );
}

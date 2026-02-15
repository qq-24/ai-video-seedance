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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m
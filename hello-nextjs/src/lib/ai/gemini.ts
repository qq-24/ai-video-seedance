/**
 * Google Gemini API wrapper for LLM interactions.
 * Handles chat completions for story-to-scenes conversion, intent parsing, and text generation.
 */

import type {
  SceneDescription,
  StoryToScenesResult,
  IntentResult,
} from "@/types/ai";

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-pro-preview";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Custom error class for Gemini API errors
 */
export class GeminiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

// Re-export with old name for backward compatibility
export { GeminiApiError as ZhipuApiError };

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the Gemini API key is configured
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// Re-export with old name for backward compatibility
export { isGeminiConfigured as isZhipuConfigured };

/**
 * Gemini API request types
 */
interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

interface GeminiGenerateContentResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Story-to-scenes prompt template
 */
const STORY_TO_SCENES_SYSTEM_PROMPT = `You are a professional video script writer. Your task is to break down a short story provided by the user into individual scenes suitable for short video production.

## Output Requirements
1. Break the story into 4-8 scenes (adjust based on story length)
2. Each scene should:
   - Have a clear visual description
   - Include characters, actions, and environment in the scene
   - Be suitable for a 5-10 second video clip
   - Maintain continuity between scenes

3. You must output in JSON format as follows:
{
  "scenes": [
    {
      "order_index": 1,
      "description": "Detailed visual description of the scene"
    }
  ]
}

## Notes
- Do not output any extra text, only output JSON
- Ensure each scene description is detailed enough to be used for image generation
- Scene descriptions should include: scene environment, character actions, emotional atmosphere, lighting effects`;

const STORY_TO_SCENES_USER_PROMPT_TEMPLATE = `Please break down the following story into video scenes:

{story}

{styleGuidance}`;

/**
 * Build style guidance based on selected style
 */
function buildStyleGuidance(style?: string): string {
  const styleMap: Record<string, string> = {
    realistic: "Style guidance: Realistic style, strong sense of realism, natural lighting",
    anime: "Style guidance: Anime style, vibrant colors, clean line art",
    cartoon: "Style guidance: Cartoon style, exaggerated and cute, bright colors",
    cinematic: "Style guidance: Cinematic style, grand and epic, professional camera work",
    watercolor: "Style guidance: Watercolor style, soft and elegant, highly artistic",
    oil_painting: "Style guidance: Oil Painting style, rich texture, deep saturated colors",
    sketch: "Style guidance: Sketch style, line-based, black-white-gray tones",
    cyberpunk: "Style guidance: Cyberpunk style, neon lights, high-tech aesthetic",
    fantasy: "Style guidance: Fantasy style, magical elements, dreamlike colors",
    scifi: "Style guidance: Sci-Fi style, futuristic feel, high-tech elements",
  };

  if (style && styleMap[style]) {
    return `\n${styleMap[style]}`;
  }
  return "\nStyle guidance: Realistic style";
}

/**
 * Parse JSON response from the model
 */
function parseScenesJson(content: string): StoryToScenesResult {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new GeminiApiError("Failed to parse scenes from response: no JSON found");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as StoryToScenesResult;

    if (!result.scenes || !Array.isArray(result.scenes)) {
      throw new GeminiApiError("Invalid response structure: missing scenes array");
    }

    result.scenes = result.scenes.map((scene, index) => ({
      order_index: scene.order_index ?? index + 1,
      description: scene.description,
    }));

    return result;
  } catch (e) {
    if (e instanceof GeminiApiError) throw e;
    throw new GeminiApiError(`Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}`);
  }
}

/**
 * Make a generateContent request to Google Gemini API
 */
async function generateContent(
  userMessage: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxOutputTokens?: number;
  } = {}
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new GeminiApiError("GEMINI_API_KEY is not configured");
  }

  const requestBody: GeminiGenerateContentRequest = {
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
    },
  };

  if (options.systemPrompt) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemPrompt }],
    };
  }

  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as GeminiGenerateContentResponse;
        throw new GeminiApiError(
          errorData.error?.message || `HTTP error ${response.status}`,
          response.status,
          errorData.error?.status
        );
      }

      clearTimeout(timeoutId);
      const data = (await response.json()) as GeminiGenerateContentResponse;

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new GeminiApiError("Empty response from Gemini model");
      }

      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // Don't retry on auth errors
      if (error instanceof GeminiApiError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error;
        }
      }

      // Abort errors shouldn't be retried
      if ((error as Error).name === "AbortError") {
        throw new GeminiApiError("Request timed out");
      }

      if (attempt < MAX_RETRIES) {
        console.warn(`Gemini API attempt ${attempt} failed, retrying...`, error);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  clearTimeout(timeoutId);
  throw new GeminiApiError(
    `Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Convert a story into scene descriptions
 */
export async function storyToScenes(
  story: string,
  style?: string
): Promise<SceneDescription[]> {
  const styleGuidance = buildStyleGuidance(style);
  const userPrompt = STORY_TO_SCENES_USER_PROMPT_TEMPLATE
    .replace("{story}", story)
    .replace("{styleGuidance}", styleGuidance);

  const content = await generateContent(userPrompt, {
    systemPrompt: STORY_TO_SCENES_SYSTEM_PROMPT,
    temperature: 0.8,
    maxOutputTokens: 4096,
  });

  const result = parseScenesJson(content);
  return result.scenes;
}

const INTENT_RECOGNITION_SYSTEM_PROMPT = `You are an intent recognition assistant. Your task is to analyze the user's natural language input and identify their intent.

## Supported Intent Types
1. generate_image - The user wants to generate an image
2. generate_text - The user wants to generate text content
3. generate_video - The user wants to generate a video
4. unknown - Unrecognizable intent

## Recognition Rules
- Contains keywords like "draw", "picture", "image", "generate image", "create a picture", etc. → generate_image
- Contains keywords like "write", "article", "story", "copy", "text", "describe", etc. → generate_text
- Contains keywords like "video", "animation", "animate", "motion", etc. → generate_video
- Cannot determine or unrelated to the above → unknown

## Output Requirements
Must output in JSON format as follows:
{
  "type": "intent type",
  "description": "Extracted user description (core description after removing intent keywords)",
  "confidence": 0.95
}

## Notes
- confidence represents the confidence level, range 0-1
- description should be the specific content description the user wants to generate
- Only output JSON, do not output any other content`;

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant.";

/**
 * Generate text using Gemini
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  return generateContent(prompt, {
    systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
    temperature: 0.7,
    maxOutputTokens: 4096,
  });
}

/**
 * Parse intent JSON from model response
 */
function parseIntentJson(content: string): IntentResult {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn("[parseIntent] No JSON found in response, returning unknown intent");
    return {
      type: "unknown",
      description: "",
      confidence: 0,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      type?: string;
      description?: string;
      confidence?: number;
    };

    const validTypes: IntentResult["type"][] = [
      "generate_image",
      "generate_text",
      "generate_video",
      "unknown",
    ];

    const type = validTypes.includes(parsed.type as IntentResult["type"])
      ? (parsed.type as IntentResult["type"])
      : "unknown";

    return {
      type,
      description: parsed.description || "",
      confidence: typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
    };
  } catch (e) {
    console.error("[parseIntent] Failed to parse JSON:", e);
    return {
      type: "unknown",
      description: "",
      confidence: 0,
    };
  }
}

/**
 * Parse user's natural language input to identify intent
 */
export async function parseIntent(input: string): Promise<IntentResult> {
  const content = await generateContent(input, {
    systemPrompt: INTENT_RECOGNITION_SYSTEM_PROMPT,
    temperature: 0.3,
    maxOutputTokens: 256,
  });

  return parseIntentJson(content);
}

/**
 * Regenerate scenes with additional guidance
 */
export async function regenerateScenes(
  story: string,
  style?: string,
  previousScenes?: SceneDescription[],
  feedback?: string
): Promise<SceneDescription[]> {
  const styleGuidance = buildStyleGuidance(style);

  let additionalContext = "";
  if (previousScenes && previousScenes.length > 0) {
    additionalContext += `\n\nPreviously generated scenes (for reference):\n${previousScenes
      .map((s) => `Scene ${s.order_index}: ${s.description}`)
      .join("\n")}`;
  }

  if (feedback) {
    additionalContext += `\n\nUser feedback (please improve based on this): ${feedback}`;
  }

  const userPrompt = `Please break down the following story into video scenes${additionalContext}:

${story}

${styleGuidance}`;

  const content = await generateContent(userPrompt, {
    systemPrompt: STORY_TO_SCENES_SYSTEM_PROMPT,
    temperature: 0.9,
    maxOutputTokens: 4096,
  });

  const result = parseScenesJson(content);
  return result.scenes;
}

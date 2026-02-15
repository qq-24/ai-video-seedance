/**
 * Zhipu AI API wrapper for GLM model interactions.
 * Handles chat completions for story-to-scenes conversion.
 */

import type {
  ZhipuChatMessage,
  ZhipuChatCompletionResponse,
  SceneDescription,
  StoryToScenesResult,
  IntentResult,
} from "@/types/ai";

// Configuration
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_BASE_URL = process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || "glm-4";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Custom error class for Zhipu API errors
 */
export class ZhipuApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = "ZhipuApiError";
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the API key is configured
 */
export function isZhipuConfigured(): boolean {
  return !!ZHIPU_API_KEY;
}

/**
 * Story-to-scenes prompt template
 * Converts a user story into a structured list of scene descriptions
 */
const STORY_TO_SCENES_SYSTEM_PROMPT = `你是一个专业的视频脚本编剧。你的任务是将用户提供的短故事拆分成适合制作短视频的独立场景。

## 输出要求
1. 将故事拆分为 4-8 个场景（根据故事长度调整）
2. 每个场景应该：
   - 有清晰的视觉描述
   - 包含场景中的人物、动作、环境
   - 适合 5-10 秒的视频展示
   - 场景之间有连贯性

3. 必须以 JSON 格式输出，格式如下：
{
  "scenes": [
    {
      "order_index": 1,
      "description": "场景的详细视觉描述"
    }
  ]
}

## 注意事项
- 不要输出任何额外文字，只输出 JSON
- 确保每个场景描述足够详细，可以用于生成图片
- 场景描述应该包含：场景环境、人物动作、情绪氛围、光影效果`;

const STORY_TO_SCENES_USER_PROMPT_TEMPLATE = `请将以下故事拆分为视频场景：

{story}

{styleGuidance}`;

/**
 * Build style guidance based on selected style
 */
function buildStyleGuidance(style?: string): string {
  const styleMap: Record<string, string> = {
    realistic: "风格指导：写实风格，真实感强，自然光影",
    anime: "风格指导：日本动漫风格，色彩鲜艳，线条清晰",
    cartoon: "风格指导：卡通风格，夸张可爱，色彩明亮",
    cinematic: "风格指导：电影质感，大气磅礴，专业运镜",
    watercolor: "风格指导：水彩画风格，柔和淡雅，艺术感强",
    oil_painting: "风格指导：油画风格，厚重质感，色彩浓郁",
    sketch: "风格指导：素描风格，线条为主，黑白灰调",
    cyberpunk: "风格指导：赛博朋克风格，霓虹灯光，科技感",
    fantasy: "风格指导：奇幻风格，魔法元素，梦幻色彩",
    scifi: "风格指导：科幻风格，未来感，高科技元素",
  };

  if (style && styleMap[style]) {
    return `\n${styleMap[style]}`;
  }
  return "\n风格指导：写实风格";
}

/**
 * Parse JSON response from the model
 */
function parseScenesJson(content: string): StoryToScenesResult {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new ZhipuApiError("Failed to parse scenes from response: no JSON found");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as StoryToScenesResult;

    // Validate the structure
    if (!result.scenes || !Array.isArray(result.scenes)) {
      throw new ZhipuApiError("Invalid response structure: missing scenes array");
    }

    // Ensure each scene has required fields
    result.scenes = result.scenes.map((scene, index) => ({
      order_index: scene.order_index ?? index + 1,
      description: scene.description,
    }));

    return result;
  } catch (e) {
    if (e instanceof ZhipuApiError) throw e;
    throw new ZhipuApiError(`Failed to parse JSON: ${e instanceof Error ? e.message : "Unknown error"}`);
  }
}

/**
 * Make a chat completion request to Zhipu AI
 */
async function chatCompletion(
  messages: ZhipuChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<ZhipuChatCompletionResponse> {
  if (!ZHIPU_API_KEY) {
    throw new ZhipuApiError("ZHIPU_API_KEY is not configured");
  }

  const requestBody = {
    model: ZHIPU_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    stream: false,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${ZHIPU_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ZHIPU_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ZhipuApiError(
          errorData.error?.message || `HTTP error ${response.status}`,
          response.status,
          errorData.error?.code
        );
      }

      clearTimeout(timeoutId);
      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // Don't retry on certain errors
      if (error instanceof ZhipuApiError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error; // Auth errors shouldn't be retried
        }
      }

      // Abort errors shouldn't be retried
      if ((error as Error).name === "AbortError") {
        throw new ZhipuApiError("Request timed out");
      }

      // Retry for other errors
      if (attempt < MAX_RETRIES) {
        console.warn(`Zhipu API attempt ${attempt} failed, retrying...`, error);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  clearTimeout(timeoutId);
  throw new ZhipuApiError(
    `Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Convert a story into scene descriptions
 * @param story - The user's story text
 * @param style - Optional visual style for the scenes
 * @returns Array of scene descriptions
 */
export async function storyToScenes(
  story: string,
  style?: string
): Promise<SceneDescription[]> {
  const styleGuidance = buildStyleGuidance(style);
  const userPrompt = STORY_TO_SCENES_USER_PROMPT_TEMPLATE.replace("{story}", story).replace(
    "{styleGuidance}",
    styleGuidance
  );

  const messages: ZhipuChatMessage[] = [
    { role: "system", content: STORY_TO_SCENES_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, {
    temperature: 0.8,
    maxTokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ZhipuApiError("Empty response from model");
  }

  const result = parseScenesJson(content);
  return result.scenes;
}

const INTENT_RECOGNITION_SYSTEM_PROMPT = `你是一个意图识别助手。你的任务是分析用户的自然语言输入，识别用户的意图。

## 支持的意图类型
1. generate_image - 用户想要生成图片
2. generate_text - 用户想要生成文本内容
3. generate_video - 用户想要生成视频
4. unknown - 无法识别的意图

## 识别规则
- 包含"画"、"图片"、"图像"、"生成图"、"画一张"等关键词 → generate_image
- 包含"写"、"文章"、"故事"、"文案"、"文字"、"描述"等关键词 → generate_text
- 包含"视频"、"动画"、"动起来"、"动态"等关键词 → generate_video
- 无法判断或与以上都无关 → unknown

## 输出要求
必须以 JSON 格式输出，格式如下：
{
  "type": "意图类型",
  "description": "提取的用户描述内容（去除意图关键词后的核心描述）",
  "confidence": 0.95
}

## 注意事项
- confidence 表示置信度，范围 0-1
- description 应该是用户想要生成的具体内容描述
- 只输出 JSON，不要输出其他内容`;

const DEFAULT_SYSTEM_PROMPT = "你是一个有帮助的AI助手。";

export async function generateText(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const messages: ZhipuChatMessage[] = [
    { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  const response = await chatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ZhipuApiError("Empty response from model");
  }

  return content;
}

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

export async function parseIntent(input: string): Promise<IntentResult> {
  const messages: ZhipuChatMessage[] = [
    { role: "system", content: INTENT_RECOGNITION_SYSTEM_PROMPT },
    { role: "user", content: input },
  ];

  const response = await chatCompletion(messages, {
    temperature: 0.3,
    maxTokens: 256,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.warn("[parseIntent] Empty response from model");
    return {
      type: "unknown",
      description: "",
      confidence: 0,
    };
  }

  return parseIntentJson(content);
}

/**
 * Regenerate scenes with additional guidance
 * @param story - The original story text
 * @param style - Visual style for the scenes
 * @param previousScenes - Previously generated scenes (for reference)
 * @param feedback - User feedback for improvement
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
    additionalContext += `\n\n之前生成的场景（供参考）：\n${previousScenes
      .map((s) => `场景 ${s.order_index}: ${s.description}`)
      .join("\n")}`;
  }

  if (feedback) {
    additionalContext += `\n\n用户反馈（请根据此改进）：${feedback}`;
  }

  const userPrompt = `请将以下故事拆分为视频场景${additionalContext}：

${story}

${styleGuidance}`;

  const messages: ZhipuChatMessage[] = [
    { role: "system", content: STORY_TO_SCENES_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, {
    temperature: 0.9,
    maxTokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ZhipuApiError("Empty response from model");
  }

  const result = parseScenesJson(content);
  return result.scenes;
}

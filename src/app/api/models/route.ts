import { NextResponse } from "next/server";
import { configuredModel, openAIEndpoint } from "@/lib/openai";

export const runtime = "nodejs";

type ModelListResponse = {
  data?: Array<{
    id?: string;
  }>;
};

const fallbackModels = [
  "o3",
  "o3-mini",
  "o4-mini",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5.1",
  "gpt-5.1-chat-latest",
  "gpt-5.2",
  "gpt-5.2-chat-latest",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.5",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "deepseek-chat",
  "deepseek-reasoner",
  "deepseek-v3.2",
  "qwen-max-latest",
  "qwen-plus-latest",
  "grok-4",
  "grok-4.1",
  "glm-4.6",
  "moonshot-v1-32k",
  "kimi-k2.6"
];

const chatPrefixes = [
  "o1",
  "o3",
  "o4",
  "gpt-",
  "chatgpt-",
  "claude-",
  "cld-",
  "gemini-",
  "ge-",
  "deepseek-",
  "qwen",
  "qwq",
  "glm-",
  "grok-",
  "kimi-",
  "moonshot-",
  "llama-",
  "doubao-",
  "ernie-",
  "yi-",
  "sonar"
];

const nonChatMarkers = [
  "embedding",
  "rerank",
  "moderation",
  "image",
  "dall-e",
  "imagen",
  "flux",
  "kolors",
  "stable-diffusion",
  "seedream",
  "jimeng",
  "banana",
  "tts",
  "transcribe",
  "whisper",
  "voice",
  "audio",
  "realtime",
  "cosyvoice",
  "chattts",
  "fish-speech",
  "sensevoice",
  "video",
  "sora",
  "t2v",
  "i2v",
  "r2v",
  "s2v",
  "wan",
  "suno",
  "3d",
  "ppt",
  "ocr",
  "vl-ocr",
  "swap_face"
];

function isChatModel(model: string) {
  const id = model.toLowerCase();
  return chatPrefixes.some((prefix) => id.startsWith(prefix)) && !nonChatMarkers.some((marker) => id.includes(marker));
}

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  const configured = configuredModel();

  if (!apiKey) {
    return NextResponse.json({ models: fallbackModels, current: configured, source: "fallback" });
  }

  try {
    const response = await fetch(openAIEndpoint("models"), {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Model list request failed: ${response.status}`);
    }

    const data = (await response.json()) as ModelListResponse;
    const models = Array.from(
      new Set((data.data ?? []).map((model) => model.id).filter((id): id is string => Boolean(id && isChatModel(id))))
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      models: models.length ? models : fallbackModels,
      current: configured,
      source: models.length ? "api" : "fallback"
    });
  } catch (error) {
    return NextResponse.json({
      models: fallbackModels,
      current: configured,
      source: "fallback",
      error: error instanceof Error ? error.message : "Unable to load models"
    });
  }
}

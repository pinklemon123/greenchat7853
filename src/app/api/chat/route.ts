import { NextResponse } from "next/server";
import { completeChat, sourceContext } from "@/lib/llm";
import { isWebSearchModel } from "@/lib/model-capabilities";
import { configuredModel } from "@/lib/openai";
import { searchTavily } from "@/lib/tavily";
import type { ChatMessage, NewsResult } from "@/lib/types";

export const runtime = "nodejs";

type IncomingChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
};

function toChatMessage(message: IncomingChatMessage): ChatMessage {
  if (message.role === "user" && message.imageDataUrl) {
    return {
      role: "user",
      content: [
        {
          type: "text",
          text: message.content || "请分析这张图片。"
        },
        {
          type: "image_url",
          image_url: {
            url: message.imageDataUrl
          }
        }
      ]
    };
  }

  return {
    role: message.role,
    content: message.content
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const incomingMessages = (body.messages ?? []) as IncomingChatMessage[];
    const messages = incomingMessages.map(toChatMessage);
    const webSearch = body.webSearch !== false;
    const model = typeof body.model === "string" ? body.model : undefined;
    const nativeWebSearch = Boolean(model && isWebSearchModel(model));
    const hasImages = incomingMessages.some((message) => Boolean(message.imageDataUrl));
    const lastUser = [...incomingMessages].reverse().find((message) => message.role === "user")?.content ?? "";
    let sources: NewsResult[] = [];

    if (webSearch && lastUser && !nativeWebSearch && !hasImages) {
      sources = (await searchTavily(lastUser, 6)).results;
    }

    const system: ChatMessage = {
      role: "system",
      content: hasImages
        ? "你是 ChatGreen 的图片理解助手。请根据用户上传的图片回答问题；如果不确定，明确说明不确定。"
        : nativeWebSearch
        ? "你是 ChatGreen 的联网研究助手。当前模型具备内置联网能力，回答时优先检索最新信息，并尽量给出来源名称和 URL。"
        : "你是 ChatGreen 的新闻与知识助手。回答要简洁、准确；如果提供了来源材料，优先基于来源材料回答，并在必要时引用来源编号。"
    };

    const context: ChatMessage = {
      role: "user",
      content: hasImages
        ? "用户可能上传了图片。请优先分析图片内容，再结合用户文字回答。"
        : nativeWebSearch
        ? "请直接使用模型内置联网能力回答用户问题。"
        : `联网搜索来源：\n${sourceContext(sources)}`
    };

    const message = await completeChat([system, context, ...messages.slice(-8)], 0.35, model);

    return NextResponse.json({
      message,
      sources,
      model: model ?? configuredModel(),
      nativeWebSearch
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}

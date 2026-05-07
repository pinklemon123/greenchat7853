import { NextResponse } from "next/server";
import { completeChat, sourceContext } from "@/lib/llm";
import { isWebSearchModel } from "@/lib/model-capabilities";
import { configuredModel } from "@/lib/openai";
import { searchTavily } from "@/lib/tavily";
import type { ChatMessage, NewsResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = (body.messages ?? []) as ChatMessage[];
    const webSearch = body.webSearch !== false;
    const model = typeof body.model === "string" ? body.model : undefined;
    const nativeWebSearch = Boolean(model && isWebSearchModel(model));
    const lastUser = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    let sources: NewsResult[] = [];

    if (webSearch && lastUser && !nativeWebSearch) {
      sources = (await searchTavily(lastUser, 6)).results;
    }

    const system: ChatMessage = {
      role: "system",
      content: nativeWebSearch
        ? "你是 ChatGreen 的联网研究助手。当前模型具备内置联网能力，回答时优先检索最新信息，并尽量给出来源名称和 URL。"
        : "你是 ChatGreen 的新闻与知识助手。回答要简洁、准确；如果提供了来源材料，优先基于来源材料回答，并在必要时引用来源编号。"
    };

    const context: ChatMessage = {
      role: "user",
      content: nativeWebSearch ? "请直接使用模型内置联网能力回答用户问题。" : `联网搜索来源：\n${sourceContext(sources)}`
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

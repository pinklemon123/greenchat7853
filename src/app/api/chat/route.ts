import { NextResponse } from "next/server";
import { completeChat, sourceContext } from "@/lib/llm";
import { searchTavily } from "@/lib/tavily";
import type { ChatMessage, NewsResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = (body.messages ?? []) as ChatMessage[];
    const webSearch = body.webSearch !== false;
    const lastUser = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    let sources: NewsResult[] = [];

    if (webSearch && lastUser) {
      sources = (await searchTavily(lastUser, 6)).results;
    }

    const system: ChatMessage = {
      role: "system",
      content:
        "你是 ChatGreen 的新闻知识助理。回答要简洁、可执行。若提供了联网来源，必须优先依据来源，并在回答末尾列出引用链接。"
    };

    const message = await completeChat(
      [
        system,
        {
          role: "user",
          content: `联网来源：\n${sourceContext(sources)}`
        },
        ...messages.slice(-8)
      ],
      0.35
    );

    return NextResponse.json({ message, sources });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}

export type NewsResult = {
  title: string;
  url: string;
  content: string;
  source?: string;
  publishedDate?: string;
  score?: number;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

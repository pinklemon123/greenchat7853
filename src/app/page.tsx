"use client";

import {
  Bot,
  BookOpenText,
  ChevronLeft,
  FilePenLine,
  Globe2,
  Home,
  LogIn,
  Menu,
  Moon,
  Newspaper,
  PenLine,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Sun,
  UserRound
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PageKey = "home" | "news" | "daily" | "chat" | "login";

type NewsResult = {
  title: string;
  url: string;
  content: string;
  source?: string;
  publishedDate?: string;
  score?: number;
};

type SearchResponse = {
  query: string;
  answer?: string;
  summary?: string;
  results: NewsResult[];
  responseTime?: string;
  cached?: boolean;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ModelListResponse = {
  models?: string[];
  current?: string;
};

const navItems: Array<{ key: PageKey; label: string; icon: typeof Home; description: string }> = [
  { key: "home", label: "主页", icon: Home, description: "项目入口和能力总览" },
  { key: "news", label: "搜索新闻", icon: Newspaper, description: "Tavily 联网新闻检索" },
  { key: "daily", label: "日常文章", icon: PenLine, description: "草稿、札记和知识整理" },
  { key: "chat", label: "AI 对话", icon: Bot, description: "支持联网和文章生成" },
  { key: "login", label: "匿名登录", icon: LogIn, description: "匿名会话和本地身份" }
];

const sampleQueries = ["AI 今日新闻", "美国科技政策", "中国经济新闻", "全球能源市场"];

const articleSeeds = [
  "把今天 AI 相关新闻整理成一篇面向普通读者的中文短文。",
  "围绕一个哲学概念，结合新闻事件写一篇思辨札记。",
  "把搜索结果改写成适合发布到知识社区的长文草稿。"
];

export default function HomePage() {
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const [query, setQuery] = useState("AI 今日新闻");
  const [articlePrompt, setArticlePrompt] = useState(articleSeeds[0]);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [article, setArticle] = useState("");
  const [loading, setLoading] = useState(false);
  const [articleLoading, setArticleLoading] = useState(false);
  const [sessionName, setSessionName] = useState("未登录");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "你好，我可以基于联网新闻、文学与哲学知识来源回答问题，也可以帮你生成文章草稿。" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>(["o3"]);
  const [selectedModel, setSelectedModel] = useState("o3");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void createAnonymousSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        const res = await fetch("/api/models", { cache: "no-store" });
        const data = (await res.json()) as ModelListResponse;
        const models = data.models?.length ? data.models : ["o3"];
        if (cancelled) return;
        setModelOptions(models);
        setSelectedModel(data.current && models.includes(data.current) ? data.current : models[0]);
      } catch {
        if (!cancelled) {
          setModelOptions(["o3"]);
          setSelectedModel("o3");
        }
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  const sources = useMemo(() => searchData?.results ?? [], [searchData]);

  async function createAnonymousSession() {
    const res = await fetch("/api/session/anonymous", { method: "POST" });
    const data = await res.json();
    setSessionName(data.displayName ?? "匿名访客");
  }

  async function runSearch(nextQuery = query, goToNews = true) {
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery, online: webSearch, summarize: true })
      });
      const data = (await res.json()) as SearchResponse;
      setSearchData(data);
      if (goToNews) setActivePage("news");
    } finally {
      setLoading(false);
    }
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: userText }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, webSearch, model: selectedModel })
      });
      const data = await res.json();
      setChatMessages([...nextMessages, { role: "assistant", content: data.message ?? "没有拿到有效回复。" }]);
      if (data.sources?.length) {
        setSearchData({
          query: userText,
          results: data.sources,
          summary: data.message
        });
      }
    } finally {
      setChatLoading(false);
    }
  }

  async function generateArticle(prompt = articlePrompt) {
    setArticleLoading(true);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sources })
      });
      const data = await res.json();
      setArticle(data.article ?? "生成失败，请稍后再试。");
      setActivePage("daily");
    } finally {
      setArticleLoading(false);
    }
  }

  function openPage(key: PageKey) {
    setActivePage(key);
    setMenuOpen(false);
  }

  return (
    <main className={`app-shell ${menuOpen ? "menu-open" : ""}`}>
      <aside className="rail">
        <button className="icon-button" aria-label="切换菜单" onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`icon-button ${activePage === item.key ? "active" : ""}`}
              aria-label={item.label}
              key={item.key}
              onClick={() => openPage(item.key)}
            >
              <Icon size={20} />
            </button>
          );
        })}
        <button className="icon-button rail-bottom" aria-label="切换主题" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Moon size={19} /> : <Sun size={19} />}
        </button>
      </aside>

      <aside className="side-menu" aria-hidden={!menuOpen}>
        <div className="side-head">
          <span>导航</span>
          <button className="icon-button" aria-label="收起菜单" onClick={() => setMenuOpen(false)}>
            <ChevronLeft size={20} />
          </button>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button type="button" className={activePage === item.key ? "selected" : ""} key={item.key} onClick={() => openPage(item.key)}>
                <Icon size={18} />
                <span>{item.label}</span>
                <small>{item.description}</small>
              </button>
            );
          })}
        </nav>
        <div className="theme-panel">
          <span>界面模式</span>
          <div className="segmented">
            <button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}>
              <Sun size={16} /> 白天
            </button>
            <button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}>
              <Moon size={16} /> 黑夜
            </button>
          </div>
          <button className="primary full" onClick={() => void createAnonymousSession()}>
            <UserRound size={16} /> 匿名登录
          </button>
          <small>{sessionName}</small>
        </div>
      </aside>

      <section className={`workspace page-${activePage}`}>
        <Topbar
          activePage={activePage}
          query={query}
          setQuery={setQuery}
          loading={loading}
          webSearch={webSearch}
          setWebSearch={setWebSearch}
          runSearch={runSearch}
        />

        {activePage === "home" ? (
          <HomeView setActivePage={setActivePage} setQuery={setQuery} runSearch={runSearch} />
        ) : null}

        {activePage === "news" ? (
          <NewsView searchData={searchData} sources={sources} query={query} setQuery={setQuery} runSearch={runSearch} loading={loading} />
        ) : null}

        {activePage === "daily" ? (
          <DailyView
            article={article}
            articlePrompt={articlePrompt}
            setArticlePrompt={setArticlePrompt}
            articleLoading={articleLoading}
            generateArticle={generateArticle}
            sources={sources}
          />
        ) : null}

        {activePage === "chat" ? (
          <ChatView
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatLoading={chatLoading}
            webSearch={webSearch}
            setWebSearch={setWebSearch}
            modelOptions={modelOptions}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            sendChat={sendChat}
            generateArticle={generateArticle}
            articleLoading={articleLoading}
          />
        ) : null}

        {activePage === "login" ? (
          <LoginView sessionName={sessionName} createAnonymousSession={createAnonymousSession} theme={theme} setTheme={setTheme} />
        ) : null}
      </section>
    </main>
  );
}

function Topbar({
  activePage,
  query,
  setQuery,
  loading,
  webSearch,
  setWebSearch,
  runSearch
}: {
  activePage: PageKey;
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  webSearch: boolean;
  setWebSearch: (value: boolean | ((current: boolean) => boolean)) => void;
  runSearch: (query?: string, goToNews?: boolean) => Promise<void>;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">CG</span>
        <div>
          <strong>ChatGreen News</strong>
          <small>{pageTitle(activePage)}</small>
        </div>
      </div>
      <form
        className="searchbar"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query, true);
        }}
      >
        <button type="button" className={webSearch ? "chip active" : "chip"} onClick={() => setWebSearch((value) => !value)}>
          <Globe2 size={14} /> 联网搜索
        </button>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索新闻、文学、哲学或知识问题" />
        <button className="primary" type="submit" disabled={loading}>
          {loading ? <RefreshCcw className="spin" size={16} /> : <Search size={16} />} 搜索
        </button>
      </form>
    </header>
  );
}

function HomeView({
  setActivePage,
  setQuery,
  runSearch
}: {
  setActivePage: (page: PageKey) => void;
  setQuery: (value: string) => void;
  runSearch: (query?: string, goToNews?: boolean) => Promise<void>;
}) {
  return (
    <section className="home-stack">
      <section className="hero-band">
        <div className="hero-copy">
          <span className="eyebrow">文学 · 哲学 · 新闻 · AI 学习</span>
          <h1>把知识搜索、新闻获取和模型对话接到同一个入口。</h1>
          <p>
            面向 green7958 的知识补充层：一边接 Tavily 联网新闻，一边保留文学和哲学知识检索的扩展空间，用模型做理解、总结和文章生成。
          </p>
          <div className="quick-row">
            {sampleQueries.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => {
                  setQuery(item);
                  void runSearch(item, true);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-orbit" aria-hidden="true">
          <BookOpenText size={64} />
        </div>
      </section>

      <section className="portal-grid">
        <PortalCard icon={Newspaper} title="搜索新闻" text="联网检索新闻来源，生成中文摘要并保留引用链接。" onClick={() => setActivePage("news")} />
        <PortalCard icon={Bot} title="AI 对话" text="像 ChatGPT 一样对话，支持联网搜索和一键生成文章。" onClick={() => setActivePage("chat")} />
        <PortalCard icon={PenLine} title="日常文章" text="沉淀研究札记、草稿和知识整理，后续可接发布流程。" onClick={() => setActivePage("daily")} />
        <PortalCard icon={LogIn} title="匿名登录" text="用匿名会话先跑通体验，后续可接正式账号系统。" onClick={() => setActivePage("login")} />
      </section>
    </section>
  );
}

function PortalCard({ icon: Icon, title, text, onClick }: { icon: typeof Home; title: string; text: string; onClick: () => void }) {
  return (
    <button className="portal-card" onClick={onClick}>
      <Icon size={22} />
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}

function NewsView({
  searchData,
  sources,
  query,
  setQuery,
  runSearch,
  loading
}: {
  searchData: SearchResponse | null;
  sources: NewsResult[];
  query: string;
  setQuery: (value: string) => void;
  runSearch: (query?: string, goToNews?: boolean) => Promise<void>;
  loading: boolean;
}) {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <span>联网新闻搜索</span>
        <h1>搜索新闻、提炼来源、保留证据链。</h1>
        <p>这一页负责新闻和知识获取渠道，后续可以并入 green7958 的文学/哲学知识库检索结果。</p>
      </div>

      <form
        className="large-search"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query, false);
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入一个新闻主题或知识问题" />
        <button className="primary" disabled={loading}>
          {loading ? <RefreshCcw className="spin" size={16} /> : <Search size={16} />} 开始搜索
        </button>
      </form>

      <article className="panel wide">
        <div className="panel-title">
          <div>
            <span>搜索摘要</span>
            <h2>{searchData?.query ?? "等待搜索"}</h2>
          </div>
          <Sparkles size={20} />
        </div>
        <p className="summary">{searchData?.summary ?? searchData?.answer ?? "输入主题后，系统会拉取新闻来源并生成可引用的中文摘要。"}</p>
      </article>

      <div className="source-list">
        {sources.length ? (
          sources.map((source) => (
            <a href={source.url} target="_blank" rel="noreferrer" className="source-card" key={source.url}>
              <span>{source.source ?? new URL(source.url).hostname}</span>
              <strong>{source.title}</strong>
              <p>{source.content}</p>
            </a>
          ))
        ) : (
          <div className="empty-state">暂无来源。先搜索一个新闻主题。</div>
        )}
      </div>
    </section>
  );
}

function DailyView({
  article,
  articlePrompt,
  setArticlePrompt,
  articleLoading,
  generateArticle,
  sources
}: {
  article: string;
  articlePrompt: string;
  setArticlePrompt: (value: string) => void;
  articleLoading: boolean;
  generateArticle: (prompt?: string) => Promise<void>;
  sources: NewsResult[];
}) {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <span>日常文章</span>
        <h1>把搜索结果和对话沉淀成可发布草稿。</h1>
        <p>这里适合做文学札记、哲学短文、新闻解读和研究记录。当前先保存生成结果，后续可接数据库发布状态。</p>
      </div>

      <section className="editor-grid">
        <article className="panel">
          <div className="panel-title">
            <div>
              <span>写作要求</span>
              <h2>生成草稿</h2>
            </div>
            <FilePenLine size={20} />
          </div>
          <textarea value={articlePrompt} onChange={(event) => setArticlePrompt(event.target.value)} />
          <div className="quick-row compact">
            {articleSeeds.map((seed) => (
              <button type="button" key={seed} onClick={() => setArticlePrompt(seed)}>
                {seed}
              </button>
            ))}
          </div>
          <button className="primary full" onClick={() => void generateArticle()} disabled={articleLoading}>
            {articleLoading ? <RefreshCcw className="spin" size={16} /> : <FilePenLine size={16} />} 生成文章
          </button>
          <small className="hint">当前会使用最近一次搜索或联网对话拿到的 {sources.length} 条来源。</small>
        </article>

        <article className="panel article-preview">
          <div className="panel-title">
            <div>
              <span>草稿预览</span>
              <h2>文章正文</h2>
            </div>
            <BookOpenText size={20} />
          </div>
          <div className="article-box">{article || "生成后的文章会显示在这里。"}</div>
        </article>
      </section>
    </section>
  );
}

function ChatView({
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  webSearch,
  setWebSearch,
  modelOptions,
  selectedModel,
  setSelectedModel,
  sendChat,
  generateArticle,
  articleLoading
}: {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  chatLoading: boolean;
  webSearch: boolean;
  setWebSearch: (value: boolean | ((current: boolean) => boolean)) => void;
  modelOptions: string[];
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  sendChat: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  generateArticle: (prompt?: string) => Promise<void>;
  articleLoading: boolean;
}) {
  return (
    <section className="chat-page">
      <aside className="chat-sidebar">
        <span>AI 对话</span>
        <h2>知识学习助手</h2>
        <p>支持联网搜索、新闻理解、文学和哲学问题讨论，也能把当前材料整理成文章。</p>
        <label className="model-picker">
          <span>模型</span>
          <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>
            {modelOptions.map((model) => (
              <option value={model} key={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <button className={webSearch ? "chip active full" : "chip full"} onClick={() => setWebSearch((value) => !value)}>
          <Globe2 size={15} /> {webSearch ? "联网搜索已开启" : "联网搜索已关闭"}
        </button>
        <button
          className="primary full"
          onClick={() => void generateArticle("根据最近的对话和来源，生成一篇结构清晰的中文学习札记。")}
          disabled={articleLoading}
        >
          {articleLoading ? <RefreshCcw className="spin" size={16} /> : <FilePenLine size={16} />} 生成学习札记
        </button>
      </aside>

      <section className="chat-main">
        <div className="chat-title">
          <Bot size={24} />
          <div>
            <h1>ChatGreen AI</h1>
            <p>{selectedModel} · {webSearch ? "联网模式，会优先检索来源再回答。" : "普通模式，只基于模型自身能力回答。"}</p>
          </div>
        </div>
        <div className="chat-transcript">
          {chatMessages.map((message, index) => (
            <div className={`chat-row ${message.role}`} key={`${message.role}-${index}`}>
              <div className="avatar">{message.role === "assistant" ? "AI" : "你"}</div>
              <div className="message-card">{message.content}</div>
            </div>
          ))}
          {chatLoading ? (
            <div className="chat-row assistant">
              <div className="avatar">AI</div>
              <div className="message-card">正在检索、阅读来源并组织回答...</div>
            </div>
          ) : null}
        </div>
        <form className="chat-composer" onSubmit={sendChat}>
          <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="问一个文学、哲学、新闻或学习问题" />
          <button className="icon-button active" type="submit" aria-label="发送">
            <Send size={18} />
          </button>
        </form>
      </section>
    </section>
  );
}

function LoginView({
  sessionName,
  createAnonymousSession,
  theme,
  setTheme
}: {
  sessionName: string;
  createAnonymousSession: () => Promise<void>;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
}) {
  return (
    <section className="page-stack narrow">
      <div className="page-heading">
        <span>匿名登录</span>
        <h1>先用匿名身份跑通搜索、对话和写作流程。</h1>
        <p>当前会设置一个 httpOnly cookie；后续可以接正式账号、管理员审核和文章发布权限。</p>
      </div>
      <article className="panel login-card">
        <UserRound size={38} />
        <h2>{sessionName}</h2>
        <p>匿名会话适合 MVP 阶段快速使用，不需要注册，也不会把模型和搜索密钥暴露给浏览器。</p>
        <button className="primary full" onClick={() => void createAnonymousSession()}>
          <LogIn size={16} /> 刷新匿名身份
        </button>
        <div className="segmented">
          <button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}>
            <Sun size={16} /> 白天
          </button>
          <button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}>
            <Moon size={16} /> 黑夜
          </button>
        </div>
      </article>
    </section>
  );
}

function pageTitle(page: PageKey) {
  switch (page) {
    case "home":
      return "知识搜索入口";
    case "news":
      return "联网新闻搜索";
    case "daily":
      return "日常文章与札记";
    case "chat":
      return "AI 对话学习";
    case "login":
      return "匿名会话";
  }
}

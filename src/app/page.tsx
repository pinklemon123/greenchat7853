"use client";

import {
  Bot,
  Bookmark,
  BookOpenText,
  ChevronLeft,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FilePenLine,
  Globe2,
  History,
  Home,
  LogIn,
  Menu,
  MessageSquare,
  Moon,
  Newspaper,
  PenLine,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Sun,
  Trash2,
  UserRound,
  Wifi
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  localData,
  newChatSession,
  titleFromMessage,
  type LocalChatMessage,
  type LocalChatSession,
  type LocalFavorite,
  type LocalReadRecord,
  type LocalSearchRecord
} from "@/lib/local-data";

type PageKey = "home" | "news" | "daily" | "chat" | "login";
type ModelMode = "normal" | "web";

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

type ModelListResponse = {
  models?: string[];
  normalModels?: string[];
  webModels?: string[];
  current?: string;
};

const navItems: Array<{ key: PageKey; label: string; icon: typeof Home; description: string }> = [
  { key: "home", label: "首页", icon: Home, description: "搜索、对话和本地资料入口" },
  { key: "news", label: "新闻搜索", icon: Newspaper, description: "搜索新闻并记录阅读" },
  { key: "daily", label: "文章草稿", icon: PenLine, description: "把来源整理成草稿" },
  { key: "chat", label: "AI 对话", icon: Bot, description: "多模型对话和历史会话" },
  { key: "login", label: "个人中心", icon: Database, description: "本地档案、收藏和导出" }
];

const sampleQueries = ["AI 今日新闻", "日本科技政策", "OpenAI 最新模型", "全球能源市场"];

const articleSeeds = [
  "根据最近搜索来源，写一篇结构清晰的中文学习札记。",
  "把这些新闻整理成一篇有标题、小节和结论的文章草稿。",
  "提炼来源里的关键事实、争议点和后续值得关注的问题。"
];

function nowMessage(role: LocalChatMessage["role"], content: string): LocalChatMessage {
  return { role, content, createdAt: Date.now() };
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function hostName(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

export default function HomePage() {
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("AI 今日新闻");
  const [articlePrompt, setArticlePrompt] = useState(articleSeeds[0]);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [article, setArticle] = useState("");
  const [loading, setLoading] = useState(false);
  const [articleLoading, setArticleLoading] = useState(false);
  const [sessionName, setSessionName] = useState("本地访客");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [modelMode, setModelMode] = useState<ModelMode>("normal");
  const [normalModels, setNormalModels] = useState<string[]>(["o3"]);
  const [webModels, setWebModels] = useState<string[]>([]);
  const [selectedNormalModel, setSelectedNormalModel] = useState("o3");
  const [selectedWebModel, setSelectedWebModel] = useState("");
  const [chatSessions, setChatSessions] = useState<LocalChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [searchHistory, setSearchHistory] = useState<LocalSearchRecord[]>([]);
  const [readHistory, setReadHistory] = useState<LocalReadRecord[]>([]);
  const [favorites, setFavorites] = useState<LocalFavorite[]>([]);

  const activeModel = modelMode === "web" ? selectedWebModel || selectedNormalModel : selectedNormalModel;
  const activeSession = chatSessions.find((session) => session.id === activeChatId) ?? chatSessions[0];
  const chatMessages = activeSession?.messages ?? [];
  const sources = useMemo(() => searchData?.results ?? [], [searchData]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void createAnonymousSession();
    void loadLocalData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        const res = await fetch("/api/models", { cache: "no-store" });
        const data = (await res.json()) as ModelListResponse;
        const nextNormal = data.normalModels?.length ? data.normalModels : data.models?.length ? data.models : ["o3"];
        const nextWeb = data.webModels ?? [];
        if (cancelled) return;
        setNormalModels(nextNormal);
        setWebModels(nextWeb);
        setSelectedNormalModel(data.current && nextNormal.includes(data.current) ? data.current : nextNormal[0]);
        setSelectedWebModel(nextWeb[0] ?? "");
      } catch {
        if (!cancelled) {
          setNormalModels(["o3"]);
          setWebModels([]);
          setSelectedNormalModel("o3");
        }
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadLocalData() {
    const [chats, searches, reads, savedFavorites] = await Promise.all([
      localData.listChats(),
      localData.listSearches(),
      localData.listReads(),
      localData.listFavorites()
    ]);
    const nextChats = chats.length ? chats : [newChatSession("o3", "normal")];
    if (!chats.length) await localData.saveChat(nextChats[0]);
    setChatSessions(nextChats);
    setActiveChatId((current) => current || nextChats[0].id);
    setSearchHistory(searches);
    setReadHistory(reads);
    setFavorites(savedFavorites);
  }

  async function createAnonymousSession() {
    try {
      const res = await fetch("/api/session/anonymous", { method: "POST" });
      const data = await res.json();
      setSessionName(data.displayName ?? "本地访客");
    } catch {
      setSessionName("本地访客");
    }
  }

  async function persistSession(session: LocalChatSession) {
    const ordered = [session, ...chatSessions.filter((item) => item.id !== session.id)].sort((a, b) => b.updatedAt - a.updatedAt);
    setChatSessions(ordered);
    setActiveChatId(session.id);
    await localData.saveChat(session);
  }

  async function createChat() {
    const session = newChatSession(activeModel, modelMode);
    await persistSession(session);
    setActivePage("chat");
  }

  async function deleteChat(id: string) {
    await localData.deleteChat(id);
    const next = chatSessions.filter((session) => session.id !== id);
    const fallback = next.length ? next : [newChatSession(activeModel, modelMode)];
    if (!next.length) await localData.saveChat(fallback[0]);
    setChatSessions(fallback);
    setActiveChatId(fallback[0].id);
  }

  async function runSearch(nextQuery = query, goToNews = true) {
    const trimmed = nextQuery.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await localData.addSearch(trimmed);
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, online: true, summarize: true })
      });
      const data = (await res.json()) as SearchResponse;
      setSearchData(data);
      setSearchHistory(await localData.listSearches());
      if (goToNews) setActivePage("news");
    } finally {
      setLoading(false);
    }
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const base = activeSession ?? newChatSession(activeModel, modelMode);
    const userMessage = nowMessage("user", userText);
    const pending: LocalChatSession = {
      ...base,
      model: activeModel,
      mode: modelMode,
      title: base.title === "新的对话" ? titleFromMessage(userText) : base.title,
      messages: [...base.messages, userMessage],
      updatedAt: Date.now()
    };

    setChatInput("");
    setChatLoading(true);
    await persistSession(pending);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: pending.messages.map(({ role, content }) => ({ role, content })),
          webSearch: modelMode === "web",
          model: activeModel
        })
      });
      const data = await res.json();
      const completed: LocalChatSession = {
        ...pending,
        messages: [...pending.messages, nowMessage("assistant", data.message ?? "没有拿到有效回复。")],
        updatedAt: Date.now()
      };
      await persistSession(completed);
      if (data.sources?.length) {
        setSearchData({ query: userText, results: data.sources, summary: data.message });
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

  async function recordRead(source: NewsResult) {
    await localData.addRead(source);
    setReadHistory(await localData.listReads());
  }

  async function saveFavorite(source: NewsResult) {
    await localData.addFavorite({
      kind: "source",
      title: source.title,
      content: source.content,
      url: source.url
    });
    setFavorites(await localData.listFavorites());
  }

  async function exportLocalData() {
    const snapshot = await localData.exportAll();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chatgreen-local-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function clearLocalData() {
    if (!confirm("确定清空本机保存的所有会话、搜索、阅读和收藏记录吗？")) return;
    await localData.clearAll();
    await loadLocalData();
  }

  function openPage(key: PageKey) {
    setActivePage(key);
    setMenuOpen(false);
  }

  return (
    <main className={`app-shell ${menuOpen ? "menu-open" : ""}`}>
      <aside className="rail">
        <button className="icon-button" aria-label="展开导航" onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={`icon-button ${activePage === item.key ? "active" : ""}`} aria-label={item.label} key={item.key} onClick={() => openPage(item.key)}>
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
          <button className="icon-button" aria-label="收起导航" onClick={() => setMenuOpen(false)}>
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
          <span>当前身份</span>
          <strong>{sessionName}</strong>
          <div className="segmented">
            <button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}>
              <Sun size={16} /> 浅色
            </button>
            <button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}>
              <Moon size={16} /> 深色
            </button>
          </div>
        </div>
      </aside>

      <section className={`workspace page-${activePage}`}>
        <Topbar activePage={activePage} query={query} setQuery={setQuery} loading={loading} runSearch={runSearch} />

        {activePage === "home" ? <HomeView setActivePage={setActivePage} setQuery={setQuery} runSearch={runSearch} /> : null}

        {activePage === "news" ? (
          <NewsView
            searchData={searchData}
            sources={sources}
            query={query}
            setQuery={setQuery}
            runSearch={runSearch}
            loading={loading}
            searchHistory={searchHistory}
            readHistory={readHistory}
            recordRead={recordRead}
            saveFavorite={saveFavorite}
          />
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
            chatSessions={chatSessions}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            deleteChat={deleteChat}
            createChat={createChat}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatLoading={chatLoading}
            modelMode={modelMode}
            setModelMode={setModelMode}
            normalModels={normalModels}
            webModels={webModels}
            selectedNormalModel={selectedNormalModel}
            selectedWebModel={selectedWebModel}
            setSelectedNormalModel={setSelectedNormalModel}
            setSelectedWebModel={setSelectedWebModel}
            activeModel={activeModel}
            sendChat={sendChat}
            generateArticle={generateArticle}
            articleLoading={articleLoading}
          />
        ) : null}

        {activePage === "login" ? (
          <DataCenterView
            sessionName={sessionName}
            chats={chatSessions}
            searches={searchHistory}
            reads={readHistory}
            favorites={favorites}
            exportLocalData={exportLocalData}
            clearLocalData={clearLocalData}
            deleteFavorite={async (id) => {
              await localData.deleteFavorite(id);
              setFavorites(await localData.listFavorites());
            }}
          />
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
  runSearch
}: {
  activePage: PageKey;
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
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
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索新闻、模型动态或学习资料" />
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
          <span className="eyebrow">新闻 · 对话 · 本地知识库</span>
          <h1>你的 AI 新闻工作台。</h1>
          <p>搜索、对话、阅读和收藏保存在当前浏览器。联网模型可直接检索，普通模型可配合搜索来源回答。</p>
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
        <PortalCard icon={Newspaper} title="新闻搜索" text="检索新闻来源，自动记录最近搜索和阅读过的链接。" onClick={() => setActivePage("news")} />
        <PortalCard icon={Bot} title="历史对话" text="会话保存在本机浏览器，下次打开还能继续聊。" onClick={() => setActivePage("chat")} />
        <PortalCard icon={PenLine} title="文章草稿" text="把搜索来源整理成学习札记、摘要或文章草稿。" onClick={() => setActivePage("daily")} />
        <PortalCard icon={Database} title="个人中心" text="查看本地档案、收藏、阅读记录，并导出或清空数据。" onClick={() => setActivePage("login")} />
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
  loading,
  searchHistory,
  readHistory,
  recordRead,
  saveFavorite
}: {
  searchData: SearchResponse | null;
  sources: NewsResult[];
  query: string;
  setQuery: (value: string) => void;
  runSearch: (query?: string, goToNews?: boolean) => Promise<void>;
  loading: boolean;
  searchHistory: LocalSearchRecord[];
  readHistory: LocalReadRecord[];
  recordRead: (source: NewsResult) => Promise<void>;
  saveFavorite: (source: NewsResult) => Promise<void>;
}) {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <span>新闻搜索</span>
        <h1>新闻来源</h1>
        <p>最近搜索和阅读记录会保存在当前浏览器。服务器只处理当次请求，不承担长期用户记录。</p>
      </div>

      <form
        className="large-search"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query, false);
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入新闻主题、公司、政策或模型名称" />
        <button className="primary" disabled={loading}>
          {loading ? <RefreshCcw className="spin" size={16} /> : <Search size={16} />} 开始搜索
        </button>
      </form>

      <section className="history-grid">
        <HistoryPanel
          title="最近搜索"
          icon={History}
          items={searchHistory.slice(0, 8).map((item) => ({
            id: item.id,
            title: item.query,
            meta: formatTime(item.createdAt),
            onClick: () => {
              setQuery(item.query);
              void runSearch(item.query, false);
            }
          }))}
        />
        <HistoryPanel
          title="阅读记录"
          icon={Clock3}
          items={readHistory.slice(0, 8).map((item) => ({
            id: item.id,
            title: item.source.title,
            meta: `${item.source.source ?? hostName(item.source.url)} · ${formatTime(item.createdAt)}`,
            href: item.source.url
          }))}
        />
      </section>

      <article className="panel wide">
        <div className="panel-title">
          <div>
            <span>搜索摘要</span>
            <h2>{searchData?.query ?? "等待搜索"}</h2>
          </div>
          <Sparkles size={20} />
        </div>
        <p className="summary">{searchData?.summary ?? searchData?.answer ?? "输入主题后，系统会检索来源并生成可引用的摘要。"}</p>
      </article>

      <div className="source-list">
        {sources.length ? (
          sources.map((source) => (
            <article className="source-card" key={source.url}>
              <span>{source.source ?? hostName(source.url)}</span>
              <strong>{source.title}</strong>
              <p>{source.content}</p>
              <div className="card-actions">
                <a href={source.url} target="_blank" rel="noreferrer" onClick={() => void recordRead(source)}>
                  <ExternalLink size={15} /> 打开
                </a>
                <button type="button" onClick={() => void saveFavorite(source)}>
                  <Star size={15} /> 收藏
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">还没有来源。先搜索一个主题。</div>
        )}
      </div>
    </section>
  );
}

function HistoryPanel({
  title,
  icon: Icon,
  items
}: {
  title: string;
  icon: typeof History;
  items: Array<{ id: string; title: string; meta: string; href?: string; onClick?: () => void }>;
}) {
  return (
    <article className="history-panel">
      <div className="panel-title">
        <h2>{title}</h2>
        <Icon size={18} />
      </div>
      <div className="compact-list">
        {items.length ? (
          items.map((item) =>
            item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer" key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </a>
            ) : (
              <button type="button" key={item.id} onClick={item.onClick}>
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </button>
            )
          )
        ) : (
          <p className="muted">暂无记录</p>
        )}
      </div>
    </article>
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
        <span>文章草稿</span>
        <h1>文章草稿</h1>
        <p>当前会使用最近一次搜索或对话返回的来源材料。</p>
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
          <small className="hint">当前可用来源：{sources.length} 条</small>
        </article>

        <article className="panel article-preview">
          <div className="panel-title">
            <div>
              <span>草稿预览</span>
              <h2>正文</h2>
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
  chatSessions,
  activeChatId,
  setActiveChatId,
  deleteChat,
  createChat,
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  modelMode,
  setModelMode,
  normalModels,
  webModels,
  selectedNormalModel,
  selectedWebModel,
  setSelectedNormalModel,
  setSelectedWebModel,
  activeModel,
  sendChat,
  generateArticle,
  articleLoading
}: {
  chatSessions: LocalChatSession[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  deleteChat: (id: string) => Promise<void>;
  createChat: () => Promise<void>;
  chatMessages: LocalChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  chatLoading: boolean;
  modelMode: ModelMode;
  setModelMode: (value: ModelMode) => void;
  normalModels: string[];
  webModels: string[];
  selectedNormalModel: string;
  selectedWebModel: string;
  setSelectedNormalModel: (value: string) => void;
  setSelectedWebModel: (value: string) => void;
  activeModel: string;
  sendChat: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  generateArticle: (prompt?: string) => Promise<void>;
  articleLoading: boolean;
}) {
  return (
    <section className="chat-page">
      <aside className="chat-sidebar">
        <div className="sidebar-heading">
          <div>
            <span>历史会话</span>
            <h2>本机保存</h2>
          </div>
          <button className="icon-button active" type="button" aria-label="新建会话" onClick={() => void createChat()}>
            <Plus size={18} />
          </button>
        </div>

        <div className="chat-session-list">
          {chatSessions.map((session) => (
            <button type="button" className={session.id === activeChatId ? "selected" : ""} key={session.id} onClick={() => setActiveChatId(session.id)}>
              <MessageSquare size={16} />
              <span>{session.title}</span>
              <small>{session.model} · {formatTime(session.updatedAt)}</small>
              <Trash2
                size={15}
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteChat(session.id);
                }}
              />
            </button>
          ))}
        </div>

        <div className="model-box">
          <span>模型模式</span>
          <div className="segmented">
            <button className={modelMode === "normal" ? "selected" : ""} onClick={() => setModelMode("normal")}>
              <Bot size={16} /> 普通
            </button>
            <button className={modelMode === "web" ? "selected" : ""} onClick={() => setModelMode("web")} disabled={!webModels.length}>
              <Wifi size={16} /> 联网
            </button>
          </div>
          <label className="model-picker">
            <span>{modelMode === "web" ? "联网模型" : "对话模型"}</span>
            <select
              value={modelMode === "web" ? selectedWebModel : selectedNormalModel}
              onChange={(event) => (modelMode === "web" ? setSelectedWebModel(event.target.value) : setSelectedNormalModel(event.target.value))}
            >
              {(modelMode === "web" ? webModels : normalModels).map((model) => (
                <option value={model} key={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
          <small className="hint">{modelMode === "web" ? "联网模型会直接使用模型内置搜索。" : "普通模型会基于模型自身能力回答。"}</small>
        </div>

        <button
          className="primary full"
          onClick={() => void generateArticle("根据最近的对话和来源，生成一篇结构清晰的中文学习札记。")}
          disabled={articleLoading}
        >
          {articleLoading ? <RefreshCcw className="spin" size={16} /> : <FilePenLine size={16} />} 生成札记
        </button>
      </aside>

      <section className="chat-main">
        <div className="chat-title">
          <Bot size={24} />
          <div>
            <h1>ChatGreen AI</h1>
            <p>{activeModel} · {modelMode === "web" ? "联网模型" : "普通对话"}</p>
          </div>
        </div>
        <div className="chat-transcript">
          {chatMessages.map((message, index) => (
            <div className={`chat-row ${message.role}`} key={`${message.role}-${message.createdAt}-${index}`}>
              <div className="avatar">{message.role === "assistant" ? "AI" : "你"}</div>
              <div className="message-card">{message.content}</div>
            </div>
          ))}
          {chatLoading ? (
            <div className="chat-row assistant">
              <div className="avatar">AI</div>
              <div className="message-card">正在整理回答...</div>
            </div>
          ) : null}
        </div>
        <form className="chat-composer" onSubmit={sendChat}>
          <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="问一个新闻、学习或资料整理问题" />
          <button className="icon-button active" type="submit" aria-label="发送" disabled={chatLoading}>
            <Send size={18} />
          </button>
        </form>
      </section>
    </section>
  );
}

function DataCenterView({
  sessionName,
  chats,
  searches,
  reads,
  favorites,
  exportLocalData,
  clearLocalData,
  deleteFavorite
}: {
  sessionName: string;
  chats: LocalChatSession[];
  searches: LocalSearchRecord[];
  reads: LocalReadRecord[];
  favorites: LocalFavorite[];
  exportLocalData: () => Promise<void>;
  clearLocalData: () => Promise<void>;
  deleteFavorite: (id: string) => Promise<void>;
}) {
  return (
    <section className="page-stack narrow">
      <div className="page-heading">
        <span>个人中心</span>
        <h1>本地档案</h1>
        <p>当前身份：{sessionName}。会话、搜索、阅读和收藏保存在当前浏览器；清理浏览器数据会同时清除它们。</p>
      </div>

      <section className="data-metrics">
        <Metric icon={MessageSquare} label="会话" value={chats.length} />
        <Metric icon={Search} label="搜索" value={searches.length} />
        <Metric icon={Clock3} label="阅读" value={reads.length} />
        <Metric icon={Bookmark} label="收藏" value={favorites.length} />
      </section>

      <article className="panel data-actions">
        <div>
          <h2>数据维护</h2>
          <p className="muted">可以导出 JSON 备份，也可以一键清空当前浏览器保存的数据。</p>
        </div>
        <button className="primary" onClick={() => void exportLocalData()}>
          <Download size={16} /> 导出 JSON
        </button>
        <button className="danger" onClick={() => void clearLocalData()}>
          <Trash2 size={16} /> 清空本地数据
        </button>
      </article>

      <section className="history-grid">
        <HistoryPanel
          title="最近搜索"
          icon={Search}
          items={searches.slice(0, 10).map((item) => ({
            id: item.id,
            title: item.query,
            meta: formatTime(item.createdAt)
          }))}
        />
        <HistoryPanel
          title="阅读记录"
          icon={Clock3}
          items={reads.slice(0, 10).map((item) => ({
            id: item.id,
            title: item.source.title,
            meta: `${item.source.source ?? hostName(item.source.url)} · ${formatTime(item.createdAt)}`,
            href: item.source.url
          }))}
        />
      </section>

      <article className="panel">
        <div className="panel-title">
          <div>
            <span>收藏</span>
            <h2>稍后再读</h2>
          </div>
          <Bookmark size={20} />
        </div>
        <div className="favorite-list">
          {favorites.length ? (
            favorites.map((item) => (
              <div className="favorite-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatTime(item.createdAt)}</span>
                </div>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} /> 打开
                  </a>
                ) : null}
                <button type="button" onClick={() => void deleteFavorite(item.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          ) : (
            <p className="muted">暂无收藏。</p>
          )}
        </div>
      </article>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: number }) {
  return (
    <article className="metric">
      <Icon size={20} />
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function pageTitle(page: PageKey) {
  switch (page) {
    case "home":
      return "工作台";
    case "news":
      return "新闻搜索";
    case "daily":
      return "文章草稿";
    case "chat":
      return "AI 对话";
    case "login":
      return "个人中心";
  }
}

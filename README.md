# ChatGreen News

一个联网新闻知识搜索 MVP：Tavily 负责联网新闻搜索，OpenAI 兼容模型接口负责聊天、总结和文章生成，Next.js 同时提供前端和后端 API。

## 功能

- 联网新闻搜索，支持 Tavily `topic: news`
- AI 聊天窗口，可切换是否联网搜索
- 基于搜索来源生成文章和摘要
- 匿名登录，会生成本地匿名会话
- 黑夜/白天主题切换
- Docker Compose 部署，包含 Postgres 和定时抓取容器

## 本地运行

```powershell
npm install
npm run dev
```

打开 `http://localhost:3000`。

## 环境变量

复制 `.env.example` 为 `.env.local`，填入：

- `TAVILY_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `DATABASE_URL`
- `CRON_SECRET`

`.env.local` 已被 `.gitignore` 忽略，不要提交密钥到 GitHub。

## Docker 部署

```bash
docker compose up -d --build
```

服务：

- `app`: Next.js 网站，端口 `3000`
- `postgres`: 数据库
- `crawler`: 每 15 分钟调用 `/api/cron/refresh`

## 数据库

Postgres 表：

- `anonymous_sessions`: 匿名用户会话
- `news_sources`: Tavily 抓取/搜索结果缓存
- `generated_articles`: 生成文章记录

第一版即时搜索会直接调用 Tavily；配置 `DATABASE_URL` 后，定时抓取和文章记录可以持久化。

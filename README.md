# Taskpath

**List meets graph—track tasks and dependencies until everything is done.**

Taskpath is a dark, **ComfyUI**-inspired workspace: switch between a crisp **list** and a **node-graph canvas** (`@xyflow/react`), with folders, tags, and auth. Data is designed around **Postgres on Supabase** and a **serverless** host (e.g. Vercel)—so your graph survives redeploys instead of living only in ephemeral memory.

[Features](#features) · [Docs & links](#documentation-and-links) · [Environment](#environment-variables) · [Contributing](#contributing) · [中文](#中文摘要) · [Issues](https://github.com/evian999/taskpath/issues)

**List** · **Canvas** · **Folders & tags** · **Auth**

---

## Table of contents

- [Features](#features)
- [Built with](#built-with)
- [Why Taskpath?](#why-taskpath)
- [Documentation and links](#documentation-and-links)
- [Security](#security)
- [Environment variables](#environment-variables)
- [Repository layout](#repository-layout)
- [Contributing](#contributing)
- [Inspiration](#inspiration)
- [中文摘要](#中文摘要)
- [License](#license)

---

## Features

- **Dual mode** — `L` / `C` to jump between list view and the canvas.
- **Folders & tags** — sidebar in list; folder lanes on the graph; toolbar filters.
- **Completion flow** — mark done, capture **results** and **next steps**, link or spawn tasks; edges stay consistent on the canvas.
- **Dark “node editor” look** — grid, cyan accents, glass panels for long sessions.

---

## Built with

- [Next.js](https://nextjs.org/)
- [React Flow](https://reactflow.dev/) (`@xyflow/react`)
- [Supabase](https://supabase.com/) (Postgres + server-side client)
- [jose](https://github.com/panva/jose) (JWT sessions)
- [Zustand](https://github.com/pmndrs/zustand) (client state)
- [Vercel](https://vercel.com/) (typical host)

---

## Why Taskpath?

Many teams outgrow a flat todo list when work looks like a **graph**: dependencies, “what we ran” and “what’s next.” Pure canvas tools are expressive; on **serverless** hosts, anything that only lives in memory or on disk disappears after a cold start.

Taskpath sits in the middle:

1. **Relational Postgres (Supabase)** — tasks, folders, tags, groups, edges, and layout are **normalized rows** per user. A single RPC (`replace_user_app_data`) applies a full snapshot in **one transaction**, so list and graph do not drift apart.
2. **Serverless-friendly** — no VM to patch; connect env vars and ship.
3. **Optional Redis (e.g. Upstash)** — login records are **not** in Supabase; on hosts without a persistent disk, Redis keeps **accounts** durable while **todo data** stays in Postgres.

We optimize for **honest constraints**, **small surface area**, and a codebase you can **fork** without a platform lecture.

---

## Documentation and links


| Resource                                       | Description                                                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[.env.example](.env.example)`                 | Environment variable names and short comments (no secrets in git).                                                                                                                      |
| `[supabase/migrations/](supabase/migrations/)` | SQL migrations—run **in filename order** in the Supabase SQL editor (`001` → `002_task_priority` → `002_user_preferences_task_api`). Skipping files often leads to **503** after login. |
| [Next.js docs](https://nextjs.org/docs)        | App Router, API routes, deployment.                                                                                                                                                     |
| [Supabase docs](https://supabase.com/docs)     | Postgres, API keys, SQL.                                                                                                                                                                |
| [React Flow](https://reactflow.dev/)           | Canvas / node graph primitives.                                                                                                                                                         |


---

## Security

- Use a **strong `AUTH_SECRET`** in production; weak defaults are unsafe on the public internet.
- `**SUPABASE_SERVICE_ROLE_KEY` bypasses RLS** — Vercel (or any server) env only; never in the browser or client bundles. Use the `**service_role`** JWT (`eyJ…`) or a Supabase **secret** key—not the **publishable / anon** key.
- Optional `DEFAULT_AUTH_USERNAME` / `DEFAULT_AUTH_PASSWORD` seed the first user when the store is empty; passwords are **hashed** before save—never commit real secrets.

---

## Environment variables


| Variable                    | Production                     | Description                                  |
| --------------------------- | ------------------------------ | -------------------------------------------- |
| `AUTH_SECRET`               | Required                       | Session JWT signing secret.                  |
| `SUPABASE_URL`              | Required*                      | Supabase project URL.                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Required*                      | Server admin key (`service_role` or secret). |
| `UPSTASH_REDIS_REST_URL`    | Strongly recommended on Vercel | Persistent auth user store.                  |
| `UPSTASH_REDIS_REST_TOKEN`  | Strongly recommended on Vercel | Paired with Redis URL.                       |
| `DEFAULT_AUTH_USERNAME`     | Optional                       | Bootstrap username.                          |
| `DEFAULT_AUTH_PASSWORD`     | Optional                       | Bootstrap password (hashed).                 |


Required for the recommended Supabase-backed setup.

---

## Repository layout

```
src/app/           # Routes, API: auth, data
src/components/    # List, canvas, sidebar, nodes
src/lib/           # Store, session, users, validation
src/lib/supabase/  # Admin client, load/save relational data
middleware.ts      # JWT gate for / and /api/data
supabase/migrations/
```

---

## Contributing

Contributions are welcome—bugfixes, docs, and small UX improvements especially.

- **Bugs:** [open an issue](https://github.com/evian999/taskpath/issues/new) with steps to reproduce if you can.
- **Features:** describe your workflow (list vs canvas, teams, sync); larger ideas are easier to align on before a big PR.

If the project grows, we can add a `CONTRIBUTING.md` with build and PR conventions (similar to [Logseq](https://github.com/logseq/logseq/blob/master/CONTRIBUTING.md) / [MarkText](https://github.com/marktext/marktext/blob/develop/CONTRIBUTING.md) style guides).

---

## Inspiration

UX and metaphors owe a debt to **node-based** tools (e.g. **ComfyUI**-style layouts) and to **outliner / graph** note workflows (think **Logseq**-style linking, even though Taskpath is not a notes app).

---

## 中文摘要

**Taskpath**：**列表 / 画布**双模式待办，可记录**结果与下一步**并保持依赖连线，适合把事一路跟到收尾。数据侧推荐 **Supabase Postgres**（按用户关系存储）；在 **Vercel** 等无持久磁盘环境建议同时配置 **Upstash Redis**（`UPSTASH_REDIS_REST_`*）以持久化*登录账号*。SQL 请在 Supabase 中**按顺序**执行 `supabase/migrations/` 下三个文件；环境变量见上文及 `[.env.example](.env.example)`（`**SUPABASE_SERVICE_ROLE_KEY` 须为 service_role，勿用 publishable/anon**）。

---

## License

**[MIT](LICENSE)** — add a `LICENSE` file if you want the text tracked in the repo.

---

Built with curiosity for people who think in graphs and ablations.
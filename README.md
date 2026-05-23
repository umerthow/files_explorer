# Windows Explorer

A Windows-Explorer-style web app: a left panel showing the entire folder hierarchy (expand/collapse, like an IDE explorer), a right panel showing the direct sub-folders and files of the selected folder, plus search and breadcrumb navigation.

Built as a Bun monorepo using clean architecture, with Elysia + Drizzle on the backend and Vue 3 + Vite on the frontend.

---

## Stack

| Layer    | Tech                                                                       |
| -------- | -------------------------------------------------------------------------- |
| Runtime  | **Bun**                                                                    |
| Backend  | **Elysia** (TypeScript) + **Drizzle ORM** + **PostgreSQL**                 |
| Frontend | **Vue 3** Composition API + **Vite** + **Pinia** + **Tailwind CSS**        |
| Testing  | `bun test` (BE unit + integration), **Vitest** (FE unit/component), **Playwright** (E2E) |
| Tooling  | Bun workspaces, Biome (lint/format)                                        |

Folder tree is implemented from scratch (no tree libraries) with a recursive component and lazy-loaded children for scalability.

---

## Project layout

```
windows_explorer/
├── apps/
│   ├── backend/       # Elysia API (clean / hexagonal architecture)
│   │   └── src/
│   │       ├── domain/          # entities + port interfaces
│   │       ├── application/     # services (use cases)
│   │       ├── infrastructure/  # drizzle repos, db client, seed
│   │       └── interface/http/  # Elysia routes, DI container
│   └── frontend/      # Vue 3 SPA
│       └── src/
│           ├── api/             # typed REST client
│           ├── stores/          # pinia explorer store
│           └── components/      # FolderTree, FolderNode, RightPanel, …
└── packages/
    └── shared/        # DTOs / types shared between FE and BE
```

---

## Data model

Two tables, **adjacency list + materialized path** (best of both worlds):

- `folders(id, parent_id, name, path, depth, created_at)` — `path` looks like `/1/4/9/` so subtree queries are an indexed `LIKE` and ancestor lookups are a `split('/')`.
- `files(id, folder_id, name, size, mime_type, created_at)`.

Indexes cover children lookup (`parent_id`), subtree/search (`path` `text_pattern_ops`), case-insensitive name search (`lower(name)`), and uniqueness on `(parent_id, name)` / `(folder_id, name)`.

---

## REST API (v1)

Base: `/api/v1`. JSON envelope: `{ "data": ..., "meta"?: ... }`. Errors: `{ "error": { "code", "message" } }` with proper HTTP status.

| Method | Path                          | Purpose                                 |
| ------ | ----------------------------- | --------------------------------------- |
| GET    | `/health`                     | Liveness                                |
| GET    | `/api/v1/folders/roots`       | Top-level folders                       |
| GET    | `/api/v1/folders/tree`        | Bulk subtree (`?rootId=&maxDepth=`)     |
| GET    | `/api/v1/folders/:id`         | Folder details + breadcrumb             |
| GET    | `/api/v1/folders/:id/children`| Direct subfolders                       |
| GET    | `/api/v1/folders/:id/files`   | Files in folder (`?limit=&cursor=`)     |
| GET    | `/api/v1/search`              | Folder + file search (`?q=&type=&limit=`) |

Auto-generated OpenAPI / Swagger UI at [`/docs`](http://localhost:3001/docs).

---

## Architecture notes

- **Hexagonal / clean architecture**: `domain` (entities + repo *ports*) → `application` (services) → `infrastructure` (Drizzle adapters) → `interface/http` (Elysia routes + DI composition root). Swapping Postgres/ORM only touches `infrastructure`.
- **SOLID**: each route delegates to a service; each service depends on small repo interfaces; the in-memory repo used by unit tests proves DIP holds.
- **Scalability**: the UI uses lazy loading by default — only roots are fetched up front, then children on expand. With materialized paths + the indexes above, every hot query is O(children) or an index range scan, regardless of total tree size. Backend is stateless and uses a Postgres connection pool, so it scales horizontally.
- **REST conventions**: versioning under `/api/v1`, plural collection nouns, sub-resources for relationships, cursor pagination.

---

## Prerequisites

- **Bun** ≥ 1.3 (the repo was built with 1.3.14)
- **PostgreSQL** reachable at `postgres://postgres:postgres@localhost:5432` (a Docker container `postgres_db` works out of the box)

---

## Quick start

```bash
# 1. install everything
bun install

# 2. create databases (one-time, in your Postgres)
docker exec postgres_db psql -U postgres -c "CREATE DATABASE explorer;"
docker exec postgres_db psql -U postgres -c "CREATE DATABASE explorer_test;"

# 3. migrate + seed (≈ 2 000 folders, ≈ 8 000 files)
bun run db:migrate
bun run db:seed

# 4. run both apps concurrently
bun run dev
# → backend on http://localhost:3001 (docs: /docs)
# → frontend on http://localhost:5173
```

The frontend dev server proxies `/api/*` to the backend, so the SPA Just Works.

---

## Scripts

Root (workspace):

| Command            | Effect                                       |
| ------------------ | -------------------------------------------- |
| `bun run dev`      | Backend + frontend in parallel               |
| `bun run build`    | Type-check & build shared, backend, frontend |
| `bun run test`     | Backend `bun test` + frontend Vitest         |
| `bun run lint`     | Biome lint                                   |
| `bun run db:migrate` / `db:seed` / `db:reset` / `db:generate` | DB tasks |

Per-app extras worth knowing:

- `cd apps/backend && bun test` — services unit tests + Drizzle/HTTP integration tests against `explorer_test`.
- `cd apps/frontend && bun run test` — Vitest unit + component tests.
- `cd apps/frontend && bun run test:e2e` — Playwright E2E (auto-starts both servers).

---

## Test status

- **Backend**: 18/18 passing (12 service unit tests + 4 Drizzle repo + HTTP tests + 1 health check + edge cases).
- **Frontend unit/component**: 9/9 passing (Pinia store + `FolderNode` interactions).
- **E2E (Playwright)**: 1/1 passing (load → expand → select → search).

---

## Bonus checklist (from the spec)

- ✅ Files in the right panel
- ✅ Open/close folders in the left panel
- ✅ Scalable design (lazy loading, indexed materialized path, pooled connections, stateless API)
- ✅ Search across folders and files
- ✅ Tailwind-based UI (no third-party tree component — built from scratch)
- ✅ Hexagonal / clean architecture
- ✅ Service + repository layers
- ✅ SOLID (DIP demonstrated by in-memory repo in tests)
- ✅ Unit tests, component tests, integration tests, E2E tests
- ✅ REST API standards (versioning, methods, plural nouns, sub-resources, cursor pagination)
- ✅ Bun runtime
- ✅ Elysia framework
- ✅ Monorepo (Bun workspaces)
- ✅ ORM (Drizzle)

---

## Configuration

`apps/backend/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/explorer
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

The integration tests default to `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/explorer_test`.

---

## Troubleshooting

- **Backend can't connect**: ensure the Postgres container is up (`docker ps`), and the `explorer` DB exists.
- **`bun -v` returns 127**: activate Bun via nvm or add `~/.bun/bin` to PATH.
- **Search returns nothing**: re-run `bun run db:seed` to populate data.

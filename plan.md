# Windows Explorer — Implementation Plan

## 1. Goals

Build a Windows Explorer-like web app per `specifications.md`, while hitting as many bonus points as possible:

- Monorepo (Bun workspaces)
- Bun runtime + Elysia backend
- Vue 3 (Composition API) frontend
- PostgreSQL + ORM
- Clean / hexagonal architecture (domain, application, infrastructure, interface)
- Service + repository layers, SOLID
- REST API standards (versioning, methods, naming)
- Unit / component / integration / E2E tests
- Search, expand/collapse, files in right panel
- Scalable design (lazy loading, indexed queries)

---

## 2. Tech Stack

| Layer | Choice | Reason |
|------|--------|--------|
| Runtime | **Bun 1.3+** | Preferred by spec, fast |
| Backend framework | **Elysia** | Preferred by spec, type-safe |
| Database | **PostgreSQL 16** (Docker, already running) | Spec-compliant |
| ORM | **Drizzle ORM** | Bun-native, lightweight, type-safe SQL |
| Validation | **Zod** (+ Elysia `t`) | Runtime safety at boundaries |
| Frontend | **Vue 3 + Vite + TS** | Spec requirement |
| State | **Pinia** | Standard Vue store |
| Styling | **Tailwind CSS** | Fast, no heavy UI dep |
| Icons | **lucide-vue-next** | Lightweight |
| Tests (BE) | **bun:test** + Supertest-style via Elysia `.handle()` | Native, fast |
| Tests (FE unit) | **Vitest** + **@vue/test-utils** | Standard |
| Tests (E2E) | **Playwright** | Robust |
| Lint/format | **Biome** | Single tool, Bun-friendly |

---

## 3. Monorepo Layout

```
windows_explorer/
├── package.json                 # workspace root, scripts
├── bun.lock
├── biome.json
├── tsconfig.base.json
├── docker-compose.yml           # postgres (already running externally, optional)
├── packages/
│   └── shared/                  # shared DTOs / types
│       ├── package.json
│       └── src/
│           ├── index.ts
│           └── folder.dto.ts
├── apps/
│   ├── backend/
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── domain/                  # entities + repo interfaces (ports)
│   │   │   │   ├── folder.entity.ts
│   │   │   │   ├── file.entity.ts
│   │   │   │   └── ports/
│   │   │   │       ├── folder.repository.ts
│   │   │   │       └── file.repository.ts
│   │   │   ├── application/             # use-cases / services
│   │   │   │   ├── folder.service.ts
│   │   │   │   └── file.service.ts
│   │   │   ├── infrastructure/          # adapters
│   │   │   │   ├── db/
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── schema.ts        # drizzle schema
│   │   │   │   │   └── migrations/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── folder.repository.drizzle.ts
│   │   │   │   │   └── file.repository.drizzle.ts
│   │   │   │   └── seed.ts
│   │   │   ├── interface/http/          # Elysia controllers
│   │   │   │   ├── server.ts
│   │   │   │   ├── container.ts         # composition root (DI)
│   │   │   │   └── v1/
│   │   │   │       ├── folders.route.ts
│   │   │   │       ├── files.route.ts
│   │   │   │       └── search.route.ts
│   │   │   └── index.ts
│   │   └── tests/
│   │       ├── unit/                    # service-level w/ in-memory repo
│   │       └── integration/             # against real Postgres
│   └── frontend/
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── src/
│       │   ├── main.ts
│       │   ├── App.vue
│       │   ├── api/
│       │   │   └── folders.api.ts
│       │   ├── stores/
│       │   │   └── explorer.store.ts
│       │   ├── composables/
│       │   │   └── useExplorer.ts
│       │   ├── components/
│       │   │   ├── ExplorerLayout.vue
│       │   │   ├── FolderTree.vue
│       │   │   ├── FolderNode.vue       # recursive
│       │   │   ├── RightPanel.vue
│       │   │   ├── ItemRow.vue
│       │   │   └── SearchBar.vue
│       │   └── styles.css
│       └── tests/
│           ├── unit/
│           └── e2e/                     # playwright
```

---

## 4. Data Model

Two tables, single-tree pattern: **adjacency list + materialized path** for the best of both worlds (cheap children query + cheap subtree query).

### `folders`
| col | type | notes |
|-----|------|-------|
| id | bigserial PK | |
| parent_id | bigint NULL FK → folders.id | NULL = root |
| name | text NOT NULL | |
| path | text NOT NULL | e.g. `/1/4/9/`, materialized |
| depth | int NOT NULL | for sorting / queries |
| created_at | timestamptz default now() | |

Indexes:
- `(parent_id)` — children lookup
- `(path text_pattern_ops)` — subtree / search prefix
- `lower(name)` — case-insensitive search
- unique `(parent_id, name)` — no duplicate sibling names

### `files`
| col | type | notes |
|-----|------|-------|
| id | bigserial PK | |
| folder_id | bigint NOT NULL FK → folders.id | |
| name | text NOT NULL | |
| size | bigint NOT NULL default 0 | |
| mime_type | text | |
| created_at | timestamptz default now() | |

Indexes: `(folder_id)`, `lower(name)`, unique `(folder_id, name)`.

---

## 5. REST API (v1)

Base: `/api/v1`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/folders/roots` | Top-level folders (lazy mode) |
| GET | `/folders/:id/children` | Direct subfolders of `:id` (right panel + lazy left expand) |
| GET | `/folders/:id/files` | Files in folder (right panel bonus) |
| GET | `/folders/:id` | Single folder metadata + breadcrumb |
| GET | `/folders/tree?rootId=&maxDepth=` | Full / partial tree (small datasets / initial paint) |
| GET | `/search?q=&type=folder|file&limit=` | Search by name |
| GET | `/health` | Liveness |

- JSON responses, consistent envelope: `{ data, meta? }`.
- Errors: RFC 7807-ish `{ error: { code, message } }` with proper HTTP status.
- Pagination on list endpoints via `?limit=&cursor=`.

---

## 6. Algorithms / Scalability

- **Default = lazy load**: frontend fetches roots, then children on expand → O(children) per click, scales to millions of nodes.
- **Bulk tree** endpoint available for small workspaces.
- **Materialized path** allows subtree fetch and prefix search without recursive CTE.
- DB indexes cover all hot queries.
- HTTP cache headers (`Cache-Control: private, max-age=…`) + ETag on folder responses.
- Backend stateless → horizontally scalable behind a load balancer.
- Connection pool via Drizzle/`postgres` driver.

---

## 7. Frontend Design

- `explorer.store` (Pinia) holds:
  - `nodes: Map<id, FolderNode>` (normalized)
  - `childrenOf: Map<id, id[]>`
  - `expanded: Set<id>`
  - `selectedId: id | null`
  - `rightPanel: { folders, files, loading }`
- `<FolderNode>` recursive component:
  - Chevron toggles expand → triggers store action → fetches children if not loaded.
  - Click name → sets `selectedId` → right panel fetches children + files.
- `<RightPanel>` shows folder + file rows; double-click folder = navigate.
- `<SearchBar>` debounced (300 ms) → `/search` → results in right panel.
- Keyboard: ↑/↓ navigate, →/← expand/collapse, Enter open.

---

## 8. Testing Strategy

- **Backend unit**: services with in-memory fake repositories (proves DI / hexagonal works).
- **Backend integration**: spin up against the real Docker Postgres, run migrations into a `test_` schema, hit Elysia via `app.handle(new Request(...))`.
- **Frontend unit**: pure composables + store.
- **Frontend component**: `FolderNode`, `RightPanel`, `SearchBar` with `@vue/test-utils`.
- **E2E** (Playwright): load app → tree renders → expand → select → right panel updates → search.

---

## 9. Tooling & DX

- Root scripts: `dev`, `build`, `test`, `lint`, `db:migrate`, `db:seed`, `db:reset`.
- `concurrently` runs backend + frontend in dev.
- `.env` files per app; `.env.example` checked in.
- `README.md` with quick start (`bun install && bun db:migrate && bun db:seed && bun dev`).

---

## 10. Milestones

1. **Scaffold monorepo** — workspaces, tsconfig, biome, root scripts.
2. **DB layer** — Drizzle schema, migration, seed (generate a deep + wide tree, ~10k folders / 50k files for demo).
3. **Backend core** — domain, repositories, services, DI container, Elysia routes v1, health check.
4. **Backend tests** — unit + integration green.
5. **Frontend scaffold** — Vite + Vue + Tailwind + Pinia + router-free SPA.
6. **Frontend features** — tree (lazy), right panel, files, expand/collapse, breadcrumb, search.
7. **Frontend tests** — unit, component, Playwright E2E.
8. **Polish** — error states, empty states, loading skeletons, keyboard nav, README.

---

## 11. Open Questions / Assumptions

- Assuming **lazy loading** is acceptable as the default UX (matches Windows Explorer + scales).
- Assuming **Drizzle** over Prisma for Bun-native ergonomics; easy to swap since repositories are abstracted.
- Assuming **Tailwind only** (no heavy UI kit) to keep bundle small and demonstrate from-scratch UI.
- Seed data volume target: 10k folders / 50k files (configurable) to demonstrate scalability without huge setup time.

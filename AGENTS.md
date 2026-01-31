# DWeaver Backend — Agent Guidelines

This file is the **baseline for all work** on the DWeaver backend. Follow it strictly. It reflects the architecture and standards from `docs/DWeaver Backend Project Requirements.pdf`.

---

## 1. Project Context

- **Product**: Platform for architectural diagrams, collaborative whiteboards, and mind maps (system architects & backend developers).
- **Backend**: Go monolithic REST API, migrating from Supabase.
- **Stack**: Gin, PostgreSQL 16 (pgxpool), Redis, gorilla/websocket; viper, zerolog/zap, go-playground/validator, golang-jwt/jwt, golang-migrate.

---

## 2. Project Structure (Use Existing)

**Do not create new top-level packages for config, database, or logger.** Use the existing layout:

- **`config/`** — Application configuration (viper, env, YAML). Import: `github.com/devenock/d_weaver/config`.
- **`pkg/database/`** — DB pool, migrations, and DB helpers (e.g. `IsUniqueViolation`). Package name is `db`; import: `github.com/devenock/d_weaver/pkg/database`.
- **`pkg/logger/`** — Level-based logger interface and zerolog implementation. Import: `github.com/devenock/d_weaver/pkg/logger`.
- **`docs/`** — OpenAPI specs (e.g. embedded auth spec). Import: `github.com/devenock/d_weaver/docs`.
- **`internal/`** — App bootstrap (`internal/app`), domain modules (e.g. `internal/auth`), and shared code (`internal/common`).

Before adding a new directory, scan the project to see if an equivalent folder or package already exists.

---

## 3. Architecture

### 3.1 Layered Layout

Every feature is implemented in **layers**. No business logic in HTTP handlers.

- **Handler** (`internal/<module>/handler`): HTTP in/out, binding, validation, mapping to/from service types. Calls service only.
- **Service** (`internal/<module>/service`): Business rules, orchestration, transactions. Calls repository and other services.
- **Repository** (`internal/<module>/repository`): DB access only. Parameterized queries, pgx/sqlc. No business logic.

Flow: `Handler → Service → Repository`. Handlers must not call repositories directly.

### 3.2 Module Order (Priority)

Implement and document **one module at a time**. Do not start the next module until the current one is implemented, documented in Swagger, and reviewed.

1. **Auth** — register, login, logout, refresh, forgot-password, reset-password  
2. **Workspaces** — CRUD, members, invitations, accept  
3. **Diagrams** — CRUD, image upload, comments  
4. **AI** — generate-diagram  
5. **Real-time** — WebSocket collaboration (`/ws/collaboration/:diagramId`)

### 3.3 API Contract

- Base path: `/api/v1`.
- Auth routes: `/api/v1/auth/*`.
- Workspaces: `/api/v1/workspaces/*`, `/api/v1/invitations/accept`.
- Diagrams: `/api/v1/diagrams/*`.
- AI: `/api/v1/ai/generate-diagram`.
- WebSocket: `/ws/collaboration/:diagramId`.

Follow the exact **Method + Endpoint** table in the PDF for each module. Do not rename or merge routes without an explicit requirement change.

---

## 4. Database & Migrations

- **Database**: PostgreSQL 16. Use the **exact schema** from the PDF (users, workspaces, workspace_members, workspace_invitations, diagrams, comments, collaboration_sessions) and the specified indexes.
- **Driver / pool**: pgxpool.
- **Migrations**: golang-migrate. All schema changes are versioned migrations; no ad-hoc DDL in app code.
- **Query layer**: sqlc or GORM as in the PDF. Prefer sqlc for type-safe, explicit SQL.
- **Redis**: Sessions, collaboration state, rate-limiting (e.g. token bucket). Use for anything the PDF marks as “consider Redis” or “Redis-backed”.

---

## 5. Security (from PDF)

- **Transport**: TLS 1.3 in production.
- **Auth**: JWT with RS256. Access token ~15 min, refresh token ~7 days.
- **Authorization**: Middleware-based RBAC; roles per workspace: owner, admin, member, viewer.
- **Input**: go-playground/validator; all SQL parameterized, no concatenation.
- **Rate limiting**: Redis-backed, 100 req/min per user (or as specified in PDF).
- **CORS**: Whitelist origins only.
- **File uploads**: Type + size checks (e.g. 10MB per file). Plan for virus scanning where required.
- **Secrets**: Env (or Vault in production). No secrets in repo or logs.

---

## 6. Non-Functional Targets (from PDF)

- API p95 latency: &lt; 100 ms where applicable.
- WebSocket latency: &lt; 50 ms.
- File upload limit: 10MB per file.
- Rate limit: 100 req/min per user (unless PDF is updated).
- Uptime target: 99.9%. Design for graceful shutdown and health/ready checks.

---

## 7. Logging

- Use **log levels** (e.g. Debug, Info, Warn, Error).
- Use a single logging abstraction (e.g. interface) so the implementation (zerolog/zap) can be swapped.
- Log request IDs, user IDs where relevant, and errors with enough context for debugging—no sensitive data (passwords, tokens, PII) in logs.

---

## 8. Errors & HTTP Responses

- **Consistent error format** for all APIs. Use a single response shape, e.g.:
  - `code`: stable string (e.g. `invalid_input`, `unauthorized`, `not_found`).
  - `message`: short, user-facing message.
  - `details`: optional (e.g. validation field errors). Omit in production if it leaks internals.
- Map domain/repository errors to HTTP status codes and the same `code`/`message` contract.
- **Meaningful messages**: e.g. “Invalid email format” instead of “Validation failed”. Keep messages stable so clients can rely on `code` and localize with `message`.

---

## 9. Documentation & Swagger

- **Per-module Swagger**: Each module adds its own paths, request/response schemas, and tags to the main OpenAPI spec.
- Document every public endpoint (method, path, request body, responses, auth). Use the same path and method as in the PDF.
- Keep the spec in sync with the implementation. When you add or change an endpoint, update Swagger in the same change set.

---

## 10. Testing

- **Test each module independently.** Unit tests for service and repository; handler tests (e.g. httptest) for HTTP contract.
- Use **testify** and standard **httptest** as in the PDF. Prefer table-driven tests for multiple cases.
- No skipping tests without a tracked reason. Prefer small, focused tests over big, coupled ones.

---

## 11. Code & Repo Conventions

- **Go**: Format with `gofmt`/`goimports`. Follow normal Go style (effective go, common style guides).
- **Imports**: Group stdlib, external, then internal. No unused imports.
- **Naming**: Clear, consistent. Handlers/services/repos named by module and layer (e.g. `auth.Handler`, `auth.Service`, `auth.Repository`).
- **Config**: viper. All service addresses, timeouts, feature flags, and limits come from config/env, not literals in code.
- **Health**: Implement `/health` and `/ready` as in the PDF. Use them for load balancer and orchestration.
- **Shutdown**: Handle SIGTERM (and optionally SIGINT): stop accepting new requests, drain in-flight, then exit. No hard exits on first signal.

---

## 12. Foundation Layout

The repo uses the existing packages for foundation:

- **`config/`**: server, DB, Redis, JWT, rate limit, CORS, etc. (viper).
- **`pkg/logger/`**: level-based logger interface; use it across handlers and services.
- **Common errors**: Domain error types and a shared way to translate them into the standard HTTP error body.
- **Response helpers**: Helpers to send success and error payloads in the chosen JSON shape so all handlers stay consistent.
- **`pkg/database/`**: DB pool and migrations; use for all DB access.
- **Router**: Gin engine, `/api/v1` group, middleware (auth, rate limit, CORS, request ID, logging). Mount health/ready outside `/api/v1` if desired.
- **App bootstrap** (`internal/app`): Load config from `config/`, init DB from `pkg/database`, then router; run server with graceful shutdown.

Keep **AGENTS.md** updated when the PDF or product decisions change (new modules, new endpoints, new NFRs). When in doubt, resolve by re-reading the PDF and this file.

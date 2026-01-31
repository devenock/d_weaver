# Decision Log – Backend & web/client

This document explains every design and implementation decision made so far for the DWeaver backend and for changes under `web/client`. It is the reference for “why we did it this way.”

---

## 0. Use existing project structure (config, pkg/database, pkg/logger)

**Decision:** Config, database, and logger live in the **existing** project layout. Do not create `internal/config`, `internal/db`, or `internal/logger`.

- **`config/`** (repo root): Viper-based config; import `github.com/devenock/d_weaver/config`.
- **`pkg/database/`**: DB pool, migrations, and helpers (e.g. `IsUniqueViolation`); package name is `db`; import `github.com/devenock/d_weaver/pkg/database`.
- **`pkg/logger/`**: Zerolog-based logger with levels; import `github.com/devenock/d_weaver/pkg/logger`.
- **`docs/`** (repo root): OpenAPI specs (e.g. embedded auth); import `github.com/devenock/d_weaver/docs`.

**Reason:** The project already had these directories; all code was switched to use them so the structure stays consistent and nothing is duplicated.

---

## 1. Project baseline and process

### 1.1 AGENTS.md as single source of truth

**Decision:** All backend work follows `AGENTS.md`, which is derived from `docs/DWeaver Backend Project Requirements.pdf`.

**Reason:** One place defines architecture, stack, security, NFRs, and workflow so the agent and developers stay aligned and consistent.

### 1.2 Layered architecture (Handler → Service → Repository)

**Decision:** Every feature is split into:

- **Handler:** HTTP only – binding, validation, mapping to/from service.
- **Service:** Business logic and orchestration, calls repositories and shared helpers.
- **Repository:** Data access only – parameterized SQL, no business rules.

**Reason:** Keeps HTTP, business rules, and persistence separate; makes testing and swapping storage straightforward; matches the “layered approach” you asked for.

### 1.3 Module-by-module order

**Decision:** Implement and document one module at a time, in this order: Auth → Workspaces → Diagrams → AI → Real-time. No starting the next until the current one is implemented, documented in Swagger, and reviewed.

**Reason:** Reduces context-switching, gives clear milestones, and keeps Swagger in sync with each module before moving on.

### 1.4 API layout and base path

**Decision:** All REST APIs live under `/api/v1`. Auth under `/api/v1/auth/*`. Exact paths and methods follow the PDF (e.g. `POST /api/v1/auth/register`).

**Reason:** Version prefix allows future v2 without breaking v1. Paths match the contract already specified in the requirements.

---

## 2. Stack and libraries

### 2.1 Gin as HTTP framework

**Decision:** Use Gin for routing and middleware (the project already had it in `go.mod`).

**Reason:** Aligns with existing code and PDF’s “chi or fiber” style: fast, widely used, good for APIs and middleware.

### 2.2 PostgreSQL 16 + pgxpool

**Decision:** Primary store is PostgreSQL 16; app uses `github.com/jackc/pgx/v5/pgxpool` for connection pooling.

**Reason:** PDF specifies PostgreSQL 16 and pgx; pgxpool gives control over pool size and is the standard Go driver for Postgres.

### 2.3 Redis

**Decision:** Redis is in the stack and in docker-compose; app config has `Redis.URL`. Auth does not use Redis yet; it will be used for sessions, collaboration state, and rate limiting as in the PDF.

**Reason:** PDF calls out “Redis – session data, collaboration state” and “Redis-backed token bucket (100 req/min)”. Wiring it in config and infra now avoids a second migration later.

### 2.4 golang-migrate for schema

**Decision:** Schema changes are versioned SQL files under `migrations/`, applied with `github.com/golang-migrate/migrate/v4`. The API runs migrations on startup when `DB_URL` is set.

**Reason:** PDF asks for “golang-migrate” and “version-controlled schema changes”. Running migrations in the app keeps dev and Docker flows simple; CI or operators can instead run the migrator binary if preferred.

### 2.5 Viper for config

**Decision:** All configuration is loaded with `github.com/spf13/viper`: env vars, optional YAML, and defaults in code.

**Reason:** PDF recommends Viper. Env-over-file keeps secrets out of repo and fits Docker/Kubernetes.

### 2.6 Zerolog for logging

**Decision:** `internal/logger` uses zerolog with a level (Debug/Info/Warn/Error). Logging is behind an interface so the implementation can be swapped.

**Reason:** PDF suggests “zerolog or zap”; level-based logging was a stated requirement; an interface keeps handlers/services independent of a concrete logger.

### 2.7 go-playground/validator + Gin binding

**Decision:** Request bodies are validated with `binding:"required,email,..."` and related tags; Gin uses `go-playground/validator` under the hood.

**Reason:** PDF requires “Go validator”; Gin’s `ShouldBindJSON` plus tags gives declarative validation and clear error paths without extra glue code.

### 2.8 JWT: RS256 preferred, HS256 for dev

**Decision:** Access tokens use RS256 when `JWT.PrivateKeyPath` and `JWT.PublicKeyPath` are set; otherwise HS256 with `JWT.RefreshTokenSecret` (dev default).

**Reason:** PDF specifies “JWT with RS256”. RS256 is better for multi-process and microservices; HS256 with a secret is simpler for local/dev when key files are not managed.

### 2.9 Passwords: bcrypt

**Decision:** Passwords are hashed with `golang.org/x/crypto/bcrypt` at default cost.

**Reason:** Standard, PDF implies “password hashing,” and bcrypt is the usual choice in Go for user passwords.

### 2.10 Refresh tokens: opaque + DB

**Decision:** Refresh tokens are random strings; we store only a hash (SHA-256) in `refresh_tokens`. The client sends the raw token; we hash it to look it up and revoke by hash.

**Reason:** Avoids storing raw tokens, allows logout/revocation, and fits “session management” and “token refresh” from the PDF.

---

## 3. Database and migrations

### 3.1 Schema source: PDF

**Decision:** Table and column definitions follow the PDF’s “Database Design” section (e.g. `users`, `workspaces`, `workspace_members`, etc.). Auth adds `refresh_tokens` and `password_reset_tokens` for token lifecycle.

**Reason:** Single source of truth for schema; extra tables are the minimal set needed for refresh and password reset described in the PDF.

### 3.2 Migrations layout

**Decision:** Migration files live in repo root under `migrations/` as `000001_*.up.sql` / `000001_*.down.sql`, etc. Config has `DB.MigrationsDir` (default `migrations`).

**Reason:** One place for schema history; default works for local and Docker when the process runs from a directory that contains `migrations/`.

### 3.3 Repo layer: pgx only, no ORM

**Decision:** Auth (and future modules) use pgx and hand-written SQL in repositories. No GORM/sqlc yet.

**Reason:** PDF says “sqlc or GORM”; starting with pgx keeps dependencies small and SQL explicit. sqlc can be added later for type-safe queries without changing the Handler/Service/Repository split.

### 3.4 Unique violation handling

**Decision:** `internal/db` exposes `IsUniqueViolation(err)` using `*pgconn.PgError` and code `"23505"`. Services use it to map “email already exists” to a conflict response.

**Reason:** Keeps Postgres-specific logic in one place and avoids leaking DB details into services; responses stay stable and client-friendly.

---

## 4. Auth module (internal/auth)

### 4.1 Package layout

**Decision:** Auth is under `internal/auth` with subpackages: `handler`, `service`, `repository`, `model`, `jwt`.

**Reason:** One module per domain, layers as packages; `model` holds entities and DTOs; `jwt` is a shared helper used by auth (and later possibly others).

### 4.2 Handler DTOs and binding

**Decision:** Handler defines request structs in `handler/dto.go` with `binding` and `json` tags. It uses `c.ShouldBindJSON` and returns 400 with a stable body when validation fails.

**Reason:** Clear request contracts, validation at the edge, and consistent error shape (see “Consistent meaningful error responses”).

### 4.3 Service interface in handler

**Decision:** Handler depends on an `AuthService` interface (Register, Login, Logout, Refresh, ForgotPassword, ResetPassword) and receives an implementation (e.g. `*service.Service`) from `app.New`.

**Reason:** Handler stays testable without a real DB or JWT; app assembles concrete implementations.

### 4.4 Service ↔ Repository interface

**Decision:** Service depends on a `Repository` interface (CreateUser, GetUserByEmail, GetUserByID, CreateRefreshToken, GetRefreshTokenByTokenHash, RevokeRefreshTokenByHash, password-reset methods). `*repository.Repository` implements it.

**Reason:** Service tests can use a mock repository; persistence can change (e.g. add caching) behind the same interface.

### 4.5 UserResponse / no password in API

**Decision:** Register and Login return a `UserResponse` (id, email, email_verified, created_at). `PasswordHash` never leaves the repo.

**Reason:** Prevents password hashes from appearing in JSON or logs; matches “meaningful” and safe API responses.

### 4.6 ForgotPassword: no user enumeration

**Decision:** ForgotPassword always returns success (e.g. 204) whether the email exists or not. Reset tokens are only created when the user exists.

**Reason:** Avoids “this email is not registered” leaks; aligns with common security practice for password reset.

### 4.7 Error responses

**Decision:** All API errors use a single shape: `{ "code": "...", "message": "...", "details": {...} }`. Codes are stable (e.g. `invalid_input`, `unauthorized`, `conflict`). Services return `common.DomainError` or sentinels; handler uses `common.WriteErrorFromDomain` to map to status and body.

**Reason:** Meets “consistent meaningful error responses”; clients can branch on `code` and show `message`; optional `details` helps for validation without exposing internals.

---

## 5. App bootstrap and HTTP

### 5.1 App entry point

**Decision:** `cmd/api/main.go` loads config, calls `app.New(cfg)`, then `a.Run()`. No global state besides what’s inside `App`.

**Reason:** Clear flow, easy to test `app.New` with a test config, and Run can be swapped for tests (e.g. start server on random port).

### 5.2 Health and ready endpoints

**Decision:** `GET /health` and `GET /ready` return 200 and a small JSON body. They do not touch DB or Redis yet.

**Reason:** PDF lists “Health Checks – /health and /ready”; load balancers and orchestrators need these. Ready can later check DB/Redis if desired.

### 5.3 Graceful shutdown

**Decision:** On SIGTERM/SIGINT, the app stops accepting new requests, waits briefly for in-flight requests (e.g. 30s), then exits.

**Reason:** PDF asks for “Graceful Shutdown – Handle SIGTERM properly”; avoids cutting off requests mid-flight in containers/orchestrators.

### 5.4 Routes and middleware

**Decision:** Gin uses `gin.New()` and `Recovery()`. No global CORS or auth middleware yet; CORS and auth can be added per-group when needed.

**Reason:** Keeps the first version simple; CORS and JWT middleware will attach to `/api/v1` (or subgroups) when we add them, without changing health/ready or docs routes.

---

## 6. Config and environment

### 6.1 Config struct and mapstructure

**Decision:** Config is a struct with nested sections (Server, DB, Redis, JWT, RateLimit, CORS). Viper uses `mapstructure` with snake_case tags where env keys are like `DB_URL`, `JWT_REFRESH_TOKEN_SECRET`.

**Reason:** Typed config in one place; env vars stay familiar; optional YAML still works for non-secrets.

### 6.2 Defaults for dev

**Decision:** Sensible defaults in code (e.g. server port 8080, JWT dev secret, migrations dir `migrations`). No default for `DB_URL`; app fails fast if it’s missing when DB is required.

**Reason:** “Just run” for local/Docker dev without a full env file; production must set DB and, ideally, JWT key paths.

### 6.3 Migrations dir default

**Decision:** `DB.MigrationsDir` defaults to `"migrations"`. In Docker, the binary runs with `MigrationsDir` set to `/app/migrations` via env so it works in the container layout.

**Reason:** Same code path for local and Docker; only env differs.

---

## 7. OpenAPI / Swagger

### 7.1 Auth spec: OpenAPI 3.0 YAML

**Decision:** Auth endpoints are documented in `api/openapi/auth.yaml` (and a copy in `internal/docs/auth.yaml` for embedding). Spec includes paths, request/response schemas, and shared error shapes.

**Reason:** “Document each module in Swagger docs”; YAML is easy to edit and merge; one file per module keeps ownership clear.

### 7.2 Serving the spec from the API

**Decision:** `GET /api-docs/auth` serves the auth OpenAPI YAML from embedded `internal/docs/auth.yaml` with content-type `application/yaml`.

**Reason:** Clients and tools can load the spec from the running API; no separate doc server for the auth module.

---

## 8. Docker and Makefile

### 8.1 Dockerfile (root): multi-stage Go

**Decision:** Two-stage build: stage one uses `golang:1.23-alpine` to build the binary; stage two uses `alpine:3.20`, copies the binary and `migrations/`, sets `DB_MIGRATIONS_DIR`, runs the binary as entrypoint.

**Reason:** Smaller image, no Go toolchain in production; migrations live beside the binary so the same app code can run them.

### 8.2 web/client Dockerfile: build then nginx

**Decision:** Frontend image: build stage uses Node to run `yarn build` (or `npm run build`); serve stage uses `nginx:alpine`, copies `dist/` and a small nginx config that does SPA fallback (`try_files ... /index.html`).

**Reason:** Production frontend is static assets; nginx is small and fast; one image both builds and serves without a Node process in production.

### 8.3 nginx-default.conf

**Decision:** In `web/client`, `nginx-default.conf` contains a minimal `server` block: listen 80, root `/usr/share/nginx/html`, `try_files $uri $uri/ /index.html` for SPA routing.

**Reason:** Client-side routing (e.g. React Router) needs all non-file paths to serve `index.html`; this is the standard pattern.

### 8.4 docker-compose layout

**Decision:** Compose file lives in `deployments/docker-compose.yml`. Services: postgres (16), redis (7), api (build from root Dockerfile), client (build from `web/client` Dockerfile). Compose is run from repo root with `-f deployments/docker-compose.yml`; build contexts are `..` and `../web/client` so they point at repo root and `web/client`.

**Reason:** Keeps deploy config in one place; run-from-root is the usual flow; contexts and Dockerfile paths are explicit.

### 8.5 .dockerignore (root and web/client)

**Decision:** Root `.dockerignore` excludes `.git`, IDE/OS junk, tests, and (optionally) `web/client` build artifacts. `web/client/.dockerignore` excludes `node_modules`, `dist`, `.env`, and similar.

**Reason:** Faster, smaller builds; avoids pulling `.env` or secrets into images; frontend build uses its own context and ignore rules.

### 8.6 Makefile targets

**Decision:** Makefile provides short targets: `docker-up`, `docker-down`, `docker-build`, `docker-logs`, `docker-ps`; `run-api`, `build-api`, `test-api`, `lint-api`, `migrate`; `client-dev`, `client-build`, `client-install`, `client-lint`, `client-preview`; `clean`; default target is `help` listing them.

**Reason:** Single place for “how do I run X?” so you can run quick commands without remembering paths or compose flags.

---

## 9. Web/client–specific decisions

### 9.1 Path: web/client (not web/clients)

**Decision:** All frontend paths and Compose references use `web/client`. There is no `web/clients` directory.

**Reason:** The repo layout has only `web/client`; using that avoids confusion and failed builds.

### 9.2 Client image and Supabase

**Decision:** The client Dockerfile does not copy `.env`. Build can receive `VITE_API_URL` (and later other `VITE_*` vars) via build-args. The app still uses Supabase for auth/data until the frontend is migrated to the Go API.

**Reason:** Keeps secrets out of the image; when you switch the UI to the Go API, you can pass `VITE_API_URL=http://api:8080` (or the public URL) at build time without code changes in this repo.

### 9.3 client container port 80

**Decision:** The client service in Compose maps host 80 to container 80 so the app is reachable at `http://localhost` when the stack is up.

**Reason:** Simple and expected for “browse the app” in local Docker.

### 9.4 CORS origins in Compose

**Decision:** API service env includes `CORS_ALLOWED_ORIGINS` with `http://localhost:5173`, `http://localhost:3000`, `http://localhost:80` so Vite dev, alternate dev port, and the containerized app can call the API.

**Reason:** Avoids browser CORS errors during dev and when using the client container; production can tighten this list.

---

## 10. What’s intentionally not done yet

- **Rate limiting:** Redis and config are ready; middleware and 100 req/min are not implemented.
- **CORS middleware:** Config exists; Gin CORS middleware is not registered yet.
- **Auth middleware:** JWT validation middleware for protected routes is not added; routes are open.
- **Workspaces / Diagrams / AI / Real-time:** Only auth is implemented; order and contracts are in AGENTS.md.
- **Logging in handlers:** Logger is prepared; handlers don’t log yet to keep the first slice minimal.
- **E2E tests:** Only unit/test layout is implied; no Playwright or similar yet.

These are left for the next steps so each change stays reviewable and aligned with the module-by-module plan.

---

## 11. Summary table

| Area | Decision | Reason |
|------|----------|--------|
| Baseline | AGENTS.md + PDF | Single source of truth |
| Layout | Handler → Service → Repository | Layered, testable |
| Module order | Auth → Workspaces → … | One at a time, reviewed |
| API path | `/api/v1/*` | Versioned, matches PDF |
| HTTP | Gin | Already in use, fits PDF |
| DB | Postgres 16 + pgxpool | PDF + control |
| Migrations | golang-migrate, run on startup | Versioned schema |
| Config | Viper + env | PDF, 12‑factor |
| Logging | Zerolog + levels + interface | PDF, swap later |
| Errors | DomainError + stable JSON | Consistent, meaningful |
| Auth JWT | RS256 or HS256 dev | PDF + practical dev |
| Auth refresh | Opaque token + hash in DB | Revocable, not stored raw |
| OpenAPI | YAML per module, embedded | Doc each module |
| Docker | Multi-stage, compose in deployments | Small image, one place |
| Frontend image | Node build + nginx serve | Static SPA |
| Makefile | help, docker-*, api, client, clean | Quick commands |

All of the above are consistent with the PDF and with the “layered approach, test per module, Swagger per module, log levels, and consistent error responses” you asked for.

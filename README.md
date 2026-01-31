# DWeaver

Backend and docs follow `docs/DWeaver Backend Project Requirements.pdf` and `AGENTS.md`.

---

## Backend modules (all implemented)

| # | Module       | Status | Scope |
|---|--------------|--------|--------|
| 1 | **Auth**     | Done   | Register, login, logout, refresh, forgot-password, reset-password |
| 2 | **Workspaces** | Done | CRUD, members, invitations, accept |
| 3 | **Diagrams** | Done   | CRUD, image upload (10MB), comments |
| 4 | **AI**       | Done   | `POST /api/v1/ai/generate-diagram` |
| 5 | **Real-time** | Done | WebSocket: `/ws/collaboration/:diagramId` |

OpenAPI specs: `GET /api-docs/auth`, `/api-docs/workspace`, `/api-docs/diagram`, `/api-docs/ai`, `/api-docs/realtime`.

---

## API reference (completed modules)

### Health
- `GET /health` — liveness
- `GET /ready` — readiness

### 1. Auth (`/api/v1/auth/*`) — no auth required for these
- `POST /api/v1/auth/register` — body `{ "email", "password" }` → `{ "data": { "user", "access_token", "refresh_token", "expires_at" } }`
- `POST /api/v1/auth/login` — same body → same shape
- `POST /api/v1/auth/logout` — body `{ "refresh_token" }` → 204
- `POST /api/v1/auth/refresh` — body `{ "refresh_token" }` → new tokens
- `POST /api/v1/auth/forgot-password` — body `{ "email" }` → 200
- `POST /api/v1/auth/reset-password` — body `{ "token", "new_password" }` → 200

All other routes below require `Authorization: Bearer <access_token>`.

### 2. Workspaces (`/api/v1/workspaces/*`, `/api/v1/invitations/*`)
- `GET /api/v1/workspaces` — list workspaces (member of)
- `POST /api/v1/workspaces` — create; body `{ "name", "description?", "color?", "tags?" }`
- `GET /api/v1/workspaces/:id` — get one
- `PUT /api/v1/workspaces/:id` — update (owner/admin)
- `DELETE /api/v1/workspaces/:id` — delete (owner only)
- `GET /api/v1/workspaces/:id/members` — list members
- `POST /api/v1/workspaces/:id/invitations` — invite; body `{ "email", "role?" }`
- `PUT /api/v1/workspaces/:id/members/:userId` — update role; body `{ "role" }`
- `DELETE /api/v1/workspaces/:id/members/:userId` — remove member
- `POST /api/v1/invitations/accept` — body `{ "token" }` (invitation UUID)

### 3. Diagrams (`/api/v1/diagrams/*`)
- `GET /api/v1/diagrams` — list (personal + workspace)
- `POST /api/v1/diagrams` — create; body `{ "title", "content", "diagram_type", "is_public?", "workspace_id?" }`
- `GET /api/v1/diagrams/public` — list public diagrams
- `GET /api/v1/diagrams/:id` — get one
- `PUT /api/v1/diagrams/:id` — update (owner or workspace admin/owner)
- `DELETE /api/v1/diagrams/:id` — delete (owner or workspace admin/owner)
- `POST /api/v1/diagrams/:id/image` — multipart form `file` (image, max 10MB); sets `image_url`
- `GET /api/v1/diagrams/:id/comments` — list comments
- `POST /api/v1/diagrams/:id/comments` — add; body `{ "comment_text" }`
- `PUT /api/v1/diagrams/:id/comments/:commentId` — update; body `{ "comment_text" }`
- `DELETE /api/v1/diagrams/:id/comments/:commentId` — delete

### 4. AI (`/api/v1/ai/*`)
- `POST /api/v1/ai/generate-diagram` — body `{ "description", "diagram_type?" }` → `{ "data": { "diagram": "<mermaid>" } }`  
  Requires `AI_API_KEY` (and optional `AI_BASE_URL`, `AI_MODEL`).

### 5. Real-time (WebSocket)
- `GET /ws/collaboration/:diagramId` — upgrade to WebSocket.  
  Auth: query `?token=<access_token>` or header `Authorization: Bearer <access_token>`.  
  Messages (JSON): server sends `join`, `leave`, `cursor`, `presence`; client can send `{"type":"cursor","position":{...}}`.

---

## Configuration (environment)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_URL` | Yes (for API) | — | PostgreSQL 16 URL, e.g. `postgres://user:pass@localhost:5432/dweaver?sslmode=disable` |
| `JWT_REFRESH_TOKEN_SECRET` | Dev | `dev-secret-change-in-production` | HS256 secret; use RS256 keys in prod |
| `JWT_PRIVATE_KEY_PATH` | Prod (RS256) | — | Path to RS256 private key |
| `JWT_PUBLIC_KEY_PATH` | Prod (RS256) | — | Path to RS256 public key |
| `SERVER_HOST` | No | `0.0.0.0` | Bind address |
| `SERVER_PORT` | No | `8200` | HTTP port |
| `UPLOAD_DIR` | No | `uploads` | Directory for diagram images (created at startup if missing) |
| `UPLOAD_MAX_BYTES` | No | `10485760` | 10MB max upload |
| `AI_API_KEY` | For AI | — | Bearer token for AI gateway (e.g. Lovable) |
| `AI_BASE_URL` | No | `https://ai.gateway.lovable.dev/v1` | OpenAI-compatible base URL |
| `AI_MODEL` | No | `google/gemini-2.5-flash` | Model name |
| `REDIS_URL` | No | — | When set, rate limiting uses Redis; otherwise in-memory (100 req/min per user or IP) |
| `LOG_LEVEL` | No | `info` | Log level: debug, info, warn, error |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | No | `100` | Max requests per minute per key (user or IP) |
| `RATE_LIMIT_ENABLED` | No | `true` | Set false to disable rate limiting |
| `CORS_ALLOWED_ORIGINS` | No | `*` | Comma or list; restrict in production |

Optional: `config.yaml` or `config/config.yaml` (viper); env overrides file.

---

## Running the API

From the repo root:

```bash
export DB_URL="postgres://user:password@localhost:5432/dweaver?sslmode=disable"
# Optional: JWT_REFRESH_TOKEN_SECRET for dev; for prod set JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH
go run ./cmd/api
```

Migrations run automatically on startup when `DB_URL` is set and the `migrations` directory exists. Or run manually: `make migrate` (requires `migrate` CLI and `DB_URL`).

- Health: `GET /health`, `GET /ready`
- OpenAPI: `GET /api-docs/{auth,workspace,diagram,ai,realtime}`

---

## Implemented (ready for testing)

- **CORS** — `gin-contrib/cors` applied from config (`CORS_ALLOWED_ORIGINS`, etc.). Response includes `X-Request-ID` in exposed headers.
- **Rate limiting** — 100 req/min per user (when Bearer token present) or per IP. Uses Redis when `REDIS_URL` is set, otherwise in-memory. Config: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_REQUESTS_PER_MINUTE`.
- **Upload directory** — `UPLOAD_DIR` is created at startup if missing.
- **Logging** — `pkg/logger` wired: request log (method, path, status, latency, `X-Request-ID`), server start/error/shutdown. Level via `LOG_LEVEL`.
- **Tests** — Unit tests for `internal/common` (error response mapping), `internal/middleware` (memory rate limiter), `internal/app` (health endpoint, config load). Run: `go test ./internal/... ./config/...`

## Before / during testing

1. **AI key** — Set `AI_API_KEY` for `POST /api/v1/ai/generate-diagram`. You will add this yourself.
2. **Frontend** — The web client still uses Supabase. To test against this backend: set API base URL (e.g. `VITE_API_URL=http://localhost:8200`), switch auth/diagrams/AI/collaboration to the endpoints and WebSocket above (see API reference).
3. **TLS** — Not in code. For production, use a reverse proxy or enable TLS in the server config.
4. **Redis** — Optional. With `REDIS_URL` set, rate limiting is Redis-backed (shared across instances). Without it, in-memory limiter is used (fine for single-instance testing).

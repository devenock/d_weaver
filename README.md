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

OpenAPI specs (raw YAML): `GET /api-docs/auth`, `/api-docs/workspace`, `/api-docs/diagram`, `/api-docs/ai`, `/api-docs/realtime`.  
**Interactive docs (Swagger UI):** `GET /swagger` or `GET /docs` — **must use the API base URL** (e.g. **http://localhost:8200/swagger**). Do not use the frontend port (3000); Swagger is served by the API only.

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
- `POST /api/v1/auth/forgot-password` — body `{ "email" }` → 204 or 200 with `{ "data": { "reset_link" } }` (when dev mode)
- `POST /api/v1/auth/reset-password` — body `{ "token", "new_password" }` → 204

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
| `DB_URL` | No* | `postgres://dweaver:dweaver_dev_password@localhost:5432/dweaver?sslmode=disable` | PostgreSQL 16 URL. Default matches Docker Compose Postgres when API runs on host. Override in `.env` or env. *Required only if you change DB. |
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
| `PASSWORD_RESET_BASE_URL` | No | — | Base URL for reset links (e.g. `https://app.example.com` or `http://localhost:3000`) |
| `PASSWORD_RESET_RETURN_LINK_IN_RESPONSE` | No | `false` | Set `true` to return `reset_link` in forgot-password response (dev mode when email is not sent) |
| `RESEND_API_KEY` | For email | — | Resend API key (from [Resend Dashboard](https://resend.com/api-keys)); when set with `PASSWORD_RESET_FROM_EMAIL`, forgot-password sends the reset link by email |
| `PASSWORD_RESET_FROM_EMAIL` | For email | — | Sender address for reset emails, e.g. `DiagramGen <noreply@yourdomain.com>` (must be a verified domain in Resend) |

Optional: `config.yaml` or `config/config.yaml` (viper); env overrides file.

### Production JWT (RS256)

For production, use **RS256** instead of the default HS256 dev secret. Set:

- `JWT_PRIVATE_KEY_PATH` — path to the RSA private key PEM file (used to sign access tokens).
- `JWT_PUBLIC_KEY_PATH` — path to the RSA public key PEM file (used to validate tokens in auth middleware).

When both are set, the API uses RS256 and ignores `JWT_REFRESH_TOKEN_SECRET` for **signing** (the secret is still used for refresh token generation). Generate a key pair (e.g. 2048-bit) and point the env vars at the files:

```bash
# Generate private key
openssl genrsa -out jwt_private.pem 2048
# Extract public key
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
```

Then set `JWT_PRIVATE_KEY_PATH=jwt_private.pem` and `JWT_PUBLIC_KEY_PATH=jwt_public.pem` (or absolute paths). Keep the private key file readable only by the process and out of version control.

---

## Running the API

From the repo root:

1. **Postgres in Docker** (recommended for local dev): run `make docker-up` to start the full stack (postgres, redis, api, client). See `make help` for other Docker targets. The API defaults to `DB_URL=postgres://dweaver:dweaver_dev_password@localhost:5432/dweaver?sslmode=disable`, so no env needed.
2. **Override DB or other vars**: copy `.env.example` to `.env` and edit. The API loads `.env` automatically when present.

```bash
# Start Postgres (and optionally Redis) in Docker
make docker-up

# Run the API (uses default DB URL or .env)
go run ./cmd/api
```

Migrations run automatically on startup when `DB_URL` is set and the `migrations` directory exists. Or run manually: `make migrate` (requires `migrate` CLI and `DB_URL`).

- Health: `GET /health`, `GET /ready`
- OpenAPI (raw): `GET /api-docs/{auth,workspace,diagram,ai,realtime}`
- **Swagger UI (interactive):** `GET /swagger` or `GET /docs` at the API origin (e.g. `http://localhost:8200/swagger`)

---

## Frontend (React)

The UI is the **React + TypeScript** app in `web/client` (Vite). The API serves only the REST API, WebSocket, and Swagger; it does not serve HTML pages.

### Run locally

1. Start Postgres (and optionally Redis): `make docker-up` (or only postgres/redis).
2. Run the API: `go run ./cmd/api` (port **8200**).
3. Run the React app: `make client-dev` or `cd web/client && npm run dev` (port **3000** or **5173**).
4. Open **http://localhost:3000** (or the port Vite prints) for the app. Use **http://localhost:8200/swagger** for API docs.

### Docker full stack

- **`make docker-up`** — API on **8200**, React client on **3000**, Postgres 5432, Redis 6379.
- **`make client-dev`** — Run the Vite dev server locally for the React frontend; point it at the API (e.g. `http://localhost:8200`). Swagger: **http://localhost:8200/swagger**.
- **`make docker-rebuild`** — Rebuild images (no cache) and start. **`make docker-restart`** — Restart containers. **`make docker-logs`** (or `docker-logs-api`, `docker-logs-client`) — View logs.

---

## Implemented (ready for testing)

- **CORS** — `gin-contrib/cors` applied from config (`CORS_ALLOWED_ORIGINS`, etc.). Response includes `X-Request-ID` in exposed headers.
- **Rate limiting** — 100 req/min per user (when Bearer token present) or per IP. Uses Redis when `REDIS_URL` is set, otherwise in-memory. Config: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_REQUESTS_PER_MINUTE`.
- **Upload directory** — `UPLOAD_DIR` is created at startup if missing.
- **Logging** — `pkg/logger` wired: request log (method, path, status, latency, `X-Request-ID`), server start/error/shutdown. Level via `LOG_LEVEL`.
- **Tests** — Unit tests for `internal/common` (error response mapping), `internal/middleware` (memory rate limiter), `internal/app` (health endpoint, config load). Run: `go test ./internal/... ./config/...`

## Password reset email (Resend)

Forgot-password can send the reset link by email using [Resend](https://resend.com). To make it fully functional:

1. **Create a Resend account** at [resend.com](https://resend.com) and get an **API key** from [API Keys](https://resend.com/api-keys).
2. **Verify a domain** in the Resend dashboard (e.g. `yourdomain.com`) so you can send from `noreply@yourdomain.com`. For testing, Resend also allows sending from `onboarding@resend.dev` to your own email.
3. **Set environment variables** (or add to `.env` / Docker Compose):
   - `RESEND_API_KEY` — your Resend API key (e.g. `re_...`).
   - `PASSWORD_RESET_FROM_EMAIL` — sender address, e.g. `DiagramGen <noreply@yourdomain.com>` or for testing `onboarding@resend.dev`.
   - `PASSWORD_RESET_BASE_URL` — base URL of your app so the link is correct (e.g. `https://app.yourdomain.com` or `http://localhost:3000`).

With these set, when a user submits "Forgot password" with their email, the API will send them an email containing the reset link. If you do not set `RESEND_API_KEY` and `PASSWORD_RESET_FROM_EMAIL`, you can still use dev mode: set `PASSWORD_RESET_RETURN_LINK_IN_RESPONSE=true` and `PASSWORD_RESET_BASE_URL` so the API returns the link in the response and the frontend can display it.

**Workspace invitations** use the same Resend config and `PASSWORD_RESET_BASE_URL`. When an owner or admin invites someone by email (e.g. from the dashboard "Invite Team" button), the API sends an email with a "Join workspace" link to `{PASSWORD_RESET_BASE_URL}/join?token=...`. The invitee can sign up or log in, then accept the invitation and be redirected to the dashboard with that workspace selected.

**When the API runs in Docker**, the container does not see your host `.env` or `.env.development` unless they are passed in. The Compose file loads repo-root `.env` and `.env.development` into the API container via `env_file`. Put your Resend credentials in **repo root** `.env.development` (or `.env`). After `make docker-up` or `make docker-rebuild`, check API logs: you should see either `Resend email configured for password reset and invitations` (with `from_email=...`) or `Resend not configured: set RESEND_API_KEY and PASSWORD_RESET_FROM_EMAIL...`. If you see "not configured", the container did not receive the vars—ensure `.env.development` (or `.env`) exists in the repo root and contains `RESEND_API_KEY` and `PASSWORD_RESET_FROM_EMAIL`, then restart the API container (e.g. `make docker-restart` or `docker compose -f deployments/docker-compose.yml up -d api`).

**Resend sender format:** Use a verified domain in Resend. The `From` field can be `noreply@yourdomain.com` or `DiagramGen <noreply@yourdomain.com>`. For testing without a domain, use `onboarding@resend.dev` (sends only to your Resend account email).

### Testing the email flow locally (no deployment)

To verify that Resend actually sends the reset email while developing locally:

1. **Create a `.env`** in the repo root (copy from `.env.example`). Set:
   - `RESEND_API_KEY` — your Resend API key.
   - `PASSWORD_RESET_FROM_EMAIL` — for testing use `onboarding@resend.dev` (Resend delivers only to the email that owns your Resend account) or a verified domain address.
   - `PASSWORD_RESET_BASE_URL=http://localhost:3000` (or the port your frontend uses) so the link in the email points to your local app.
   - Set `PASSWORD_RESET_RETURN_LINK_IN_RESPONSE=false` (or leave unset); otherwise the API returns the link in the response instead of sending email. The `deployments/docker-compose.yml` file has this set to `false` by default when using Resend. If you're running the API locally with `go run`, ensure this env var is `false` or unset in your `.env`.

2. **Start the stack**: Postgres + API + frontend (e.g. `make docker-up` or run API with `go run ./cmd/api` and frontend with `make client-dev`). Ensure the API loads `.env` (when running `go run ./cmd/api` from repo root, `godotenv` loads it).

3. **Create a user** whose email is one you can receive mail at (e.g. the same email as your Resend account when using `onboarding@resend.dev`): sign up via the app or `POST /api/v1/auth/register`.

4. **Trigger forgot-password**: open the app at http://localhost:3000, go to Login → “Forgot password?”, enter that user’s email, submit.

5. **Check delivery**: open the inbox for that address. You should see “Reset your password” with a link like `http://localhost:3000/reset-password?token=...`. Click it and set a new password to confirm the full flow.

6. **If something fails**: check API logs for `password reset email send failed` (and the underlying error). You can also check the [Resend dashboard](https://resend.com/emails) for send status and errors.

## Troubleshooting

- **GET /api/v1/diagrams returns 500** — Usually the database is missing the `diagrams` table. The API runs migrations on startup; if the DB was created before all migrations existed, ensure the API has restarted so it can run any new migrations. You can also run migrations manually: set `DB_URL` (e.g. `postgres://dweaver:dweaver_dev_password@localhost:5432/dweaver?sslmode=disable`) and run `make migrate` (requires the [migrate](https://github.com/golang-migrate/migrate) CLI). Check API logs for the real error: on list diagrams failure the server logs the underlying cause (e.g. `relation "diagrams" does not exist`).

## Before / during testing

1. **AI key** — Set `AI_API_KEY` for `POST /api/v1/ai/generate-diagram`. You will add this yourself.
2. **Frontend** — The web client uses the Go API for auth. Set `VITE_API_URL` when the frontend and API run on different origins (e.g. `http://localhost:8200`).
3. **TLS** — Not in code. For production, use a reverse proxy or enable TLS in the server config.
4. **Redis** — Optional. With `REDIS_URL` set, rate limiting is Redis-backed (shared across instances). Without it, in-memory limiter is used (fine for single-instance testing).

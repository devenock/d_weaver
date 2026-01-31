# DWeaver

Backend and docs follow `docs/DWeaver Backend Project Requirements.pdf` and `AGENTS.md`.

## Backend modules

| # | Module      | Status   | Scope |
|---|-------------|----------|--------|
| 1 | **Auth**    | Done     | Register, login, logout, refresh, forgot-password, reset-password |
| 2 | **Workspaces** | Done  | CRUD, members, invitations, accept |
| 3 | **Diagrams** | Done   | CRUD, image upload (10MB), comments |
| 4 | **AI**      | Done     | `POST /api/v1/ai/generate-diagram` |
| 5 | **Real-time** | Done | WebSocket: `/ws/collaboration/:diagramId` (auth: `?token=` or `Authorization: Bearer`); join/leave/cursor/presence |

- **Done**: All modules implemented, wired in app, OpenAPI spec at `/api-docs/<module>`.
- **collaboration_sessions** migration (000009) for optional persistence; WebSocket hub is in-memory (single instance).

## Running the API

From the repo root:

```bash
export DB_URL="postgres://user:password@localhost:5432/dweaver?sslmode=disable"
# Optional for dev: JWT uses HS256 with JWT_REFRESH_TOKEN_SECRET (default dev secret). For prod use RS256: set JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH.
go run ./cmd/api
```

- Health: `GET /health`, `GET /ready`
- Auth OpenAPI spec: `GET /api-docs/auth`
- Auth routes: `POST /api/v1/auth/register`, `/login`, `/logout`, `/refresh`, `/forgot-password`, `/reset-password`

Run migrations yourself or rely on the API startup (it runs migrations when `DB_URL` is set and a `migrations` directory exists).

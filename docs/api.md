# DWeaver API Reference

This document summarizes the REST API used by the DWeaver backend and the React dashboard. For the source of truth, see the [DWeaver Backend Project Requirements](./DWeaver%20Backend%20Project%20Requirements.pdf) and the OpenAPI specs below.

## Base URL and version

- **Base path:** `/api/v1`
- **Auth:** All routes except auth and health/ready require `Authorization: Bearer <access_token>`.

## OpenAPI (Swagger) docs

- **Interactive UI:** `GET /swagger` or `GET /docs` at the API origin (e.g. `http://localhost:8200/swagger`). Use the API port (8200), not the frontend port.
- **Raw YAML per module:**
  - `GET /api-docs/auth` — Auth (register, login, logout, refresh, forgot-password, reset-password)
  - `GET /api-docs/workspace` — Workspaces, members, invitations
  - `GET /api-docs/diagram` — Diagrams, image upload, comments
  - `GET /api-docs/ai` — AI generate-diagram
  - `GET /api-docs/realtime` — WebSocket collaboration

## Dashboard endpoints (all implemented)

The React dashboard in `web/client` uses these endpoints. They are implemented in the Go backend and documented in the OpenAPI specs.

### Auth (no Bearer required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register; body `{ "email", "password" }` |
| POST | `/api/v1/auth/login` | Login; same body → tokens + user |
| POST | `/api/v1/auth/logout` | Body `{ "refresh_token" }` → 204 |
| POST | `/api/v1/auth/refresh` | Body `{ "refresh_token" }` → new tokens + user |
| POST | `/api/v1/auth/forgot-password` | Body `{ "email" }` → 204 or 200 with `reset_link` (dev) |
| POST | `/api/v1/auth/reset-password` | Body `{ "token", "new_password" }` → 204 |

### Workspaces (Bearer required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/workspaces` | List workspaces; each item includes current user's `role` |
| POST | `/api/v1/workspaces` | Create; body `{ "name", "description?", "color?", "tags?" }` |
| GET | `/api/v1/workspaces/:id` | Get one workspace |
| PUT | `/api/v1/workspaces/:id` | Update (owner/admin) |
| DELETE | `/api/v1/workspaces/:id` | Delete (owner only) |
| GET | `/api/v1/workspaces/:id/members` | List members |
| POST | `/api/v1/workspaces/:id/invitations` | Invite; body `{ "email", "role?" }` |
| PUT | `/api/v1/workspaces/:id/members/:userId` | Update member role; body `{ "role" }` |
| DELETE | `/api/v1/workspaces/:id/members/:userId` | Remove member |
| POST | `/api/v1/invitations/accept` | Accept invitation; body `{ "token" }` |

### Diagrams (Bearer required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/diagrams` | List diagrams (personal + workspace) |
| GET | `/api/v1/diagrams/public` | List public diagrams |
| POST | `/api/v1/diagrams` | Create; body `{ "title", "content", "diagram_type", "is_public?", "workspace_id?" }` |
| GET | `/api/v1/diagrams/:id` | Get one diagram |
| PUT | `/api/v1/diagrams/:id` | Update diagram |
| DELETE | `/api/v1/diagrams/:id` | Delete diagram |
| POST | `/api/v1/diagrams/:id/image` | Upload image (multipart `file`; max 10MB) |
| GET | `/api/v1/diagrams/:id/comments` | List comments |
| POST | `/api/v1/diagrams/:id/comments` | Add comment; body `{ "comment_text" }` |
| PUT | `/api/v1/diagrams/:id/comments/:commentId` | Update comment |
| DELETE | `/api/v1/diagrams/:id/comments/:commentId` | Delete comment |

### AI (Bearer required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ai/generate-diagram` | Body `{ "description", "diagram_type?" }` → `{ "data": { "diagram": "<mermaid>" } }` |

### Real-time

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ws/collaboration/:diagramId` | WebSocket; auth via query `?token=<access_token>` or `Authorization: Bearer` |

## Response format

- **Success:** JSON body `{ "data": <payload> }`. For 204 No Content, no body.
- **Error:** JSON body `{ "code": "<stable_code>", "message": "<user_message>", "details": <optional> }`. See `AGENTS.md` and OpenAPI for codes.

## Health

- `GET /health` — Liveness
- `GET /ready` — Readiness

## Frontend usage

The dashboard uses:

- `web/client/src/lib/auth-api.ts` — auth endpoints
- `web/client/src/lib/workspace-api.ts` — workspace endpoints
- `web/client/src/lib/diagram-api.ts` — diagram endpoints

All expect the API to return `{ "data": ... }` and parse it via `apiRequest` / `apiRequestWithAuth` in `web/client/src/lib/api.ts`. Image URLs for diagrams are resolved with `resolveImageUrl()` when the backend returns a path (e.g. `/uploads/diagrams/...`).

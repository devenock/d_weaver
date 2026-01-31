# htmx static frontend (Phase 1)

This directory contains the htmx-based static frontend for DWeaver. It is served by the Go API when `web.static_dir` is set (default: `web/static`).

## Phase 1 scope

- **Index** (`/`) – landing page, same look as React
- **Login** (`/login`) – form POST to Go; cookie-based session
- **Signup** (`/signup`) – form POST to Go; cookie-based session
- **Dashboard** (`/dashboard`) – protected; requires valid `access_token` cookie
- **Gallery** (`/gallery`), **Join workspace** (`/join-workspace`) – placeholders
- **Editor** (`/editor`), **Whiteboard** (`/whiteboard`) – placeholders (full UI in later phases)
- **404** – unhandled GETs serve `404.html`
- **Auth redirect** – `/auth` redirects to `/login?redirect=/dashboard`

## Phase 2 scope (dashboard list)

- **Dashboard** – sidebar (workspaces list + New Diagram / New Whiteboard) and main content (Your Diagrams grid).
- **Partials** (htmx, same-origin cookie):
  - `GET /dashboard/partials/workspaces` – HTML fragment of workspace list for sidebar.
  - `GET /dashboard/partials/diagrams` – HTML fragment of diagram cards (title, type, updated_at, preview, link to editor/whiteboard).
- **API cookie auth** – `RequireAuth` middleware accepts `access_token` cookie when `Authorization: Bearer` is missing (same-origin). So the API can be called with credentials from the htmx app.

## Cookie-based auth

- **POST /login** – body: `email`, `password`, `redirect` (optional). On success: sets `access_token` (httpOnly cookie) and redirects to `redirect` or `/dashboard`.
- **POST /signup** – body: `email`, `password`, `redirect`. On success: sets cookie and redirects.
- **POST /logout** – clears `access_token` and redirects to `/`.

Protected routes (`/dashboard`) require a valid JWT in the `access_token` cookie; otherwise redirect to `/login?redirect=...`.

## Assets

- **CSS**: `/static/css/site.css` – design system (same tokens as React `index.css`)
- **htmx**: loaded from CDN in each HTML page (`https://unpkg.com/htmx.org@2.0.4`)

## Running

From repo root, with DB and config set:

```bash
go run ./cmd/api
```

Then open http://localhost:8200/ (or your configured host/port). The same server serves the API (`/api/v1/*`) and the static frontend.

## Later phases

- **Phase 3**: Editor page with Mermaid island
- **Phase 4**: Whiteboard as embedded JS app
- **Phase 5**: Real-time collaboration (JS + WebSocket)

# Docs Directory Status

## Current State

- **`api.md`** — API overview, dashboard endpoint tables, response format, and pointers to OpenAPI. Kept in sync with the backend and React dashboard.
- **`architecture.md`** — Empty; to be populated with architecture diagrams and component descriptions.

## Reference Document

- `DWeaver Backend Project Requirements.pdf` - **Contains complete project requirements** (used as source of truth)

## Action Items

1. **architecture.md** — To be populated with:
   - System architecture diagrams
   - Component descriptions
   - Data flow diagrams
   - Technology stack details

## Note

The project uses:
- **`AGENTS.md`** (repo root) — Development guidelines and standards.
- **OpenAPI specs** — `auth.yaml`, `workspace.yaml`, `diagram.yaml`, `ai.yaml`, `realtime.yaml` in this directory; served at `GET /api-docs/{auth,workspace,diagram,ai,realtime}` and via Swagger UI at `GET /swagger`.
- **PDF** — `DWeaver Backend Project Requirements.pdf` as source of truth.

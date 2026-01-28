# DWeaver

Backend and docs follow `docs/DWeaver Backend Project Requirements.pdf` and `AGENTS.md`.

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

# DWeaver Makefile – run from repo root
# Use: make help | make docker-up | make run-api | make client-dev | etc.

.PHONY: help docker-up docker-down docker-build docker-logs docker-ps \
	run-api build-api test-api lint-api migrate \
	client-dev client-build client-install client-lint client-preview \
	clean

# Default target
help:
	@echo "DWeaver – quick commands (run from repo root)"
	@echo ""
	@echo "Docker (full stack)"
	@echo "  make docker-up        Start postgres, redis, api, client"
	@echo "  make docker-down      Stop all containers"
	@echo "  make docker-build     Build and start containers"
	@echo "  make docker-rebuild   Rebuild images (no cache) and start"
	@echo "  make docker-restart   Restart all containers"
	@echo "  make docker-logs      Follow all logs"
	@echo "  make docker-logs-api  make docker-logs-client  (per-service)"
	@echo "  make docker-logs-postgres  make docker-logs-redis"
	@echo "  make docker-ps        List running containers"
	@echo ""
	@echo "Backend (Go API)"
	@echo "  make run-api          Run API locally (need DB_URL, see README)"
	@echo "  make build-api        Build Go binary"
	@echo "  make test-api         Run Go tests"
	@echo "  make lint-api         Run go vet"
	@echo "  make migrate          Run DB migrations (use DB_URL)"
	@echo ""
	@echo "Frontend (web/client)"
	@echo "  make client-dev       Start Vite dev server"
	@echo "  make client-build     Build for production"
	@echo "  make client-install   Install frontend deps"
	@echo "  make client-lint      Run ESLint"
	@echo "  make client-preview   Preview production build"
	@echo ""
	@echo "Other"
	@echo "  make clean            Remove build artifacts and caches"

# --- Docker ---
COMPOSE_FILE := deployments/docker-compose.yml

docker-up:
	docker compose -f $(COMPOSE_FILE) up -d

docker-down:
	docker compose -f $(COMPOSE_FILE) down

docker-build:
	docker compose -f $(COMPOSE_FILE) up -d --build

docker-rebuild:
	docker compose -f $(COMPOSE_FILE) build --no-cache
	docker compose -f $(COMPOSE_FILE) up -d

docker-restart:
	docker compose -f $(COMPOSE_FILE) restart

docker-logs:
	docker compose -f $(COMPOSE_FILE) logs -f

docker-logs-api:
	docker compose -f $(COMPOSE_FILE) logs -f api

docker-logs-client:
	docker compose -f $(COMPOSE_FILE) logs -f client

docker-logs-postgres:
	docker compose -f $(COMPOSE_FILE) logs -f postgres

docker-logs-redis:
	docker compose -f $(COMPOSE_FILE) logs -f redis

docker-ps:
	docker compose -f $(COMPOSE_FILE) ps

# --- Backend (Go API) ---
API_MAIN := ./cmd/api

run-api:
	go run $(API_MAIN)

build-api:
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/api $(API_MAIN)

test-api:
	go test ./...

lint-api:
	go vet ./...

# Migrations (golang-migrate) – requires DB_URL and migrate installed
MIGRATIONS_DIR ?= migrations
migrate:
	@if [ -z "$$DB_URL" ]; then echo "Set DB_URL, e.g. export DB_URL=postgres://..."; exit 1; fi
	migrate -path $(MIGRATIONS_DIR) -database "$$DB_URL" up

# --- Frontend (web/client) ---
CLIENT_DIR := web/client

client-dev:
	cd $(CLIENT_DIR) && yarn dev

client-build:
	cd $(CLIENT_DIR) && yarn build

client-install:
	cd $(CLIENT_DIR) && yarn install

client-lint:
	cd $(CLIENT_DIR) && yarn lint

client-preview:
	cd $(CLIENT_DIR) && yarn preview

# --- Clean ---
clean:
	rm -rf bin/
	rm -rf $(CLIENT_DIR)/dist
	rm -rf $(CLIENT_DIR)/.vite
	@echo "Cleaned build artifacts"

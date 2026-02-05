# Frontend runs as Vite dev server so the app is reachable on port 3000.
# Vite is configured to listen on 0.0.0.0:3000 (see vite.config.ts).
# Use BuildKit for cache mounts: DOCKER_BUILDKIT=1 docker build ...
FROM node:22-alpine

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json yarn.lock* package-lock* ./

# Install dependencies with cache mount (requires BuildKit)
# Cache mount persists yarn cache between builds, significantly speeding up rebuilds
# If BuildKit is not available, fallback to regular install
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,target=/root/.npm \
    yarn install --frozen-lockfile --network-timeout 100000 2>/dev/null || \
    npm ci --cache=/root/.npm 2>/dev/null || \
    npm install --cache=/root/.npm

# Copy application code (this layer only invalidates when code changes)
COPY . .

# VITE_PROXY_API: when running in Docker Compose, set to http://api:8200 so /api is proxied to the api service.
ENV VITE_PROXY_API=http://api:8200

EXPOSE 3000

CMD ["npm", "run", "dev"]

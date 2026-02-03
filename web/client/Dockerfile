# Frontend runs as Vite dev server so the app is reachable on port 3000.
# Vite is configured to listen on 0.0.0.0:3000 (see vite.config.ts).
FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock* package-lock* ./
RUN yarn install --frozen-lockfile 2>/dev/null || npm ci 2>/dev/null || npm install

COPY . .

# VITE_PROXY_API: when running in Docker Compose, set to http://api:8200 so /api is proxied to the api service.
ENV VITE_PROXY_API=http://api:8200

EXPOSE 3000

CMD ["npm", "run", "dev"]

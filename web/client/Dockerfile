# Build stage – do not copy .env; use build-args for public env at build time if needed
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock* package-lock* ./
RUN yarn install --frozen-lockfile 2>/dev/null || npm ci 2>/dev/null || npm install

COPY . .
# Optional: pass VITE_API_URL, VITE_SUPABASE_URL etc. via build-args when migrating to Go API
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

RUN yarn build 2>/dev/null || npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

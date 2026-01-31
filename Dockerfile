# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /build

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /build/api ./cmd/api

# Run stage
FROM alpine:3.20
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /build/api .
COPY migrations ./migrations
COPY --from=builder /build/web/static ./web/static

ENV DB_MIGRATIONS_DIR=/app/migrations
EXPOSE 8200

ENTRYPOINT ["./api"]

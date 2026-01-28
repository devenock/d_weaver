package db

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/devenock/d_weaver/internal/config"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool returns a pgxpool.Pool for the given config and runs migrations from the migrations directory.
func Pool(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	if cfg.DB.URL == "" {
		return nil, fmt.Errorf("db: DB_URL is required")
	}

	pool, err := pgxpool.New(ctx, cfg.DB.URL)
	if err != nil {
		return nil, fmt.Errorf("db: pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db: ping: %w", err)
	}

	// Run migrations (postgres driver expects postgres:// or postgresql:// URL)
	migrationsPath := "file://migrations"
	if dir := cfg.DB.MigrationsDir; dir != "" {
		abs, _ := filepath.Abs(dir)
		migrationsPath = "file://" + abs
	}
	m, err := migrate.New(migrationsPath, cfg.DB.URL)
	if err != nil {
		pool.Close()
		return nil, fmt.Errorf("db: migrate new: %w", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		pool.Close()
		return nil, fmt.Errorf("db: migrate up: %w", err)
	}

	return pool, nil
}

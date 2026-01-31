package main

import (
	"log"
	"os"

	"github.com/devenock/d_weaver/config"
	"github.com/devenock/d_weaver/internal/app"
	"github.com/devenock/d_weaver/pkg/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env from repo root so DB_URL etc. are set when running locally (e.g. Postgres in Docker).
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	level := "info"
	if cfg.Log.Level != "" {
		level = cfg.Log.Level
	}
	appLog := logger.New(level, os.Stdout)
	logger.Global(appLog)

	a, err := app.New(cfg, appLog)
	if err != nil {
		log.Fatalf("app: %v", err)
	}

	if err := a.Run(); err != nil {
		log.Fatalf("run: %v", err)
	}
	os.Exit(0)
}

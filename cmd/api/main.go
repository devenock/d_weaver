package main

import (
	"log"
	"os"

	"github.com/devenock/d_weaver/internal/app"
	"github.com/devenock/d_weaver/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	a, err := app.New(cfg)
	if err != nil {
		log.Fatalf("app: %v", err)
	}

	if err := a.Run(); err != nil {
		log.Fatalf("run: %v", err)
	}
	os.Exit(0)
}

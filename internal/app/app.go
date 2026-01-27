package app

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/devenock/d_weaver/internal/auth/handler"
	authrepo "github.com/devenock/d_weaver/internal/auth/repository"
	authsvc "github.com/devenock/d_weaver/internal/auth/service"
	"github.com/devenock/d_weaver/internal/config"
	"github.com/gin-gonic/gin"
)

// App holds router, server, and dependencies for bootstrap and graceful shutdown.
type App struct {
	Router *gin.Engine
	Server *http.Server
	Config *config.Config
}

// New builds the Gin engine, binds routes and middleware, and returns App and Server.
func New(cfg *config.Config) (*App, error) {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	// Health and readiness (PDF: /health and /ready)
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/ready", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ready"}) })

	// API v1 group (PDF: /api/v1)
	v1 := r.Group("/api/v1")
	authRepo := authrepo.New()
	authSvc := authsvc.New(authRepo)
	authHandler := handler.New(authSvc)
	authHandler.Register(v1)

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	return &App{Router: r, Server: srv, Config: cfg}, nil
}

// Run starts the HTTP server and blocks until SIGTERM/SIGINT, then shuts down gracefully.
func (a *App) Run() error {
	go func() {
		if err := a.Server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			// logger here when wired
			_, _ = os.Stderr.WriteString("server: " + err.Error() + "\n")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := a.Server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}
	return nil
}

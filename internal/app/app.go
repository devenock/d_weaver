package app

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/devenock/d_weaver/config"
	"github.com/devenock/d_weaver/docs"
	"github.com/devenock/d_weaver/internal/ai/client"
	aihandler "github.com/devenock/d_weaver/internal/ai/handler"
	aisvc "github.com/devenock/d_weaver/internal/ai/service"
	"github.com/devenock/d_weaver/internal/auth/handler"
	"github.com/devenock/d_weaver/internal/auth/jwt"
	authrepo "github.com/devenock/d_weaver/internal/auth/repository"
	authsvc "github.com/devenock/d_weaver/internal/auth/service"
	diagramhandler "github.com/devenock/d_weaver/internal/diagram/handler"
	diagramrepo "github.com/devenock/d_weaver/internal/diagram/repository"
	diagramsvc "github.com/devenock/d_weaver/internal/diagram/service"
	"github.com/devenock/d_weaver/internal/realtime"
	workspacehandler "github.com/devenock/d_weaver/internal/workspace/handler"
	workspacerepo "github.com/devenock/d_weaver/internal/workspace/repository"
	workspacesvc "github.com/devenock/d_weaver/internal/workspace/service"
	"github.com/devenock/d_weaver/pkg/database"
	"github.com/gin-gonic/gin"
)

// App holds router, server, and dependencies for bootstrap and graceful shutdown.
type App struct {
	Router *gin.Engine
	Server *http.Server
	Config *config.Config
}

// New builds the Gin engine, binds routes and middleware, and returns App and Server.
// Requires cfg.DB.URL and JWT config (PrivateKeyPath or RefreshTokenSecret for dev).
func New(cfg *config.Config) (*App, error) {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	// Health and readiness (PDF: /health and /ready)
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/ready", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ready"}) })
	// Swagger/OpenAPI per module (AGENTS: document each module)
	r.GET("/api-docs/auth", docs.ServeAuth)
	r.GET("/api-docs/workspace", docs.ServeWorkspace)
	r.GET("/api-docs/diagram", docs.ServeDiagram)
	r.GET("/api-docs/ai", docs.ServeAI)
	r.GET("/api-docs/realtime", docs.ServeRealtime)
	// Serve uploaded diagram images (PDF: 10MB limit enforced on upload)
	if cfg.Upload.Dir != "" {
		r.Static("/uploads", cfg.Upload.Dir)
	}

	// API v1 group (PDF: /api/v1)
	v1 := r.Group("/api/v1")

	pool, err := db.Pool(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("app: db: %w", err)
	}
	jwtIssuer, err := jwt.NewIssuer(&cfg.JWT)
	if err != nil {
		return nil, fmt.Errorf("app: jwt: %w", err)
	}
	authRepo := authrepo.New(pool)
	authSvc := authsvc.New(authRepo, jwtIssuer, cfg.JWT.AccessDurationMinutes, cfg.JWT.RefreshDurationDays)
	authHandler := handler.New(authSvc)
	authHandler.Register(v1)

	workspaceRepo := workspacerepo.New(pool)
	workspaceSvc := workspacesvc.New(workspaceRepo)
	workspaceHandler := workspacehandler.New(workspaceSvc, jwtIssuer)
	workspaceHandler.Register(v1)

	diagramRepo := diagramrepo.New(pool)
	diagramSvc := diagramsvc.New(diagramRepo, workspaceRepo)
	diagramHandler := diagramhandler.New(diagramSvc, jwtIssuer, cfg.Upload)
	diagramHandler.Register(v1)

	aiGen := client.NewHTTPGenerator(cfg.AI.APIKey, cfg.AI.BaseURL, cfg.AI.Model)
	aiSvc := aisvc.New(aiGen)
	aiHandler := aihandler.New(aiSvc)
	aiHandler.Register(v1, jwtIssuer)

	realtimeHub := realtime.NewHub()
	realtimeHandler := realtime.NewHandler(realtimeHub, jwtIssuer, diagramSvc)
	r.GET("/ws/collaboration/:diagramId", realtimeHandler.ServeWS)

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

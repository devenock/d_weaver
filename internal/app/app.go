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
	authemail "github.com/devenock/d_weaver/internal/auth/email"
	"github.com/devenock/d_weaver/internal/auth/handler"
	"github.com/devenock/d_weaver/internal/auth/jwt"
	authrepo "github.com/devenock/d_weaver/internal/auth/repository"
	authsvc "github.com/devenock/d_weaver/internal/auth/service"
	diagramhandler "github.com/devenock/d_weaver/internal/diagram/handler"
	diagramrepo "github.com/devenock/d_weaver/internal/diagram/repository"
	diagramsvc "github.com/devenock/d_weaver/internal/diagram/service"
	"github.com/devenock/d_weaver/internal/middleware"
	"github.com/devenock/d_weaver/internal/realtime"
	workspacehandler "github.com/devenock/d_weaver/internal/workspace/handler"
	workspacerepo "github.com/devenock/d_weaver/internal/workspace/repository"
	workspacesvc "github.com/devenock/d_weaver/internal/workspace/service"
	"github.com/devenock/d_weaver/pkg/database"
	pkglogger "github.com/devenock/d_weaver/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"github.com/redis/go-redis/v9"
)

// App holds router, server, and dependencies for bootstrap and graceful shutdown.
type App struct {
	Router *gin.Engine
	Server *http.Server
	Config *config.Config
	Log    pkglogger.Logger
}

// New builds the Gin engine, binds routes and middleware, and returns App and Server.
// log may be nil to skip request logging. Requires cfg.DB.URL and JWT config (PrivateKeyPath or RefreshTokenSecret for dev).
func New(cfg *config.Config, log pkglogger.Logger) (*App, error) {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	// CORS (from config). Fallback to allow all origins if empty (e.g. env JSON not parsed).
	allowOrigins := cfg.CORS.AllowedOrigins
	if len(allowOrigins) == 0 {
		allowOrigins = []string{"*"}
	}
	// With credentials (cookies/auth), the browser requires a specific origin, not "*".
	// Use a dev-friendly list when config has wildcard so auth flow works locally and in Docker.
	allowCredentials := true
	if len(allowOrigins) == 1 && allowOrigins[0] == "*" {
		allowOrigins = []string{"http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"}
	}
	allowMethods := cfg.CORS.AllowedMethods
	if len(allowMethods) == 0 {
		allowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	}
	allowHeaders := cfg.CORS.AllowedHeaders
	if len(allowHeaders) == 0 {
		allowHeaders = []string{"Authorization", "Content-Type", "X-Request-ID"}
	}
	corsConfig := cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     allowMethods,
		AllowHeaders:     allowHeaders,
		AllowCredentials: allowCredentials,
		ExposeHeaders:    []string{"X-Request-ID"},
	}
	r.Use(cors.New(corsConfig))

	// Request ID + optional request logging
	r.Use(middleware.RequestLog(log))

	// Ensure upload directory exists
	if cfg.Upload.Dir != "" {
		_ = os.MkdirAll(cfg.Upload.Dir, 0755)
	}

	// Health and readiness (PDF: /health and /ready)
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/ready", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ready"}) })
	// Swagger/OpenAPI per module (AGENTS: document each module)
	r.GET("/api-docs/auth", docs.ServeAuth)
	r.GET("/api-docs/workspace", docs.ServeWorkspace)
	r.GET("/api-docs/diagram", docs.ServeDiagram)
	r.GET("/api-docs/ai", docs.ServeAI)
	r.GET("/api-docs/realtime", docs.ServeRealtime)
	// Interactive Swagger UI — use API port (e.g. http://localhost:8200/swagger), not the frontend port
	r.GET("/swagger", docs.ServeSwagger)
	r.GET("/swagger/", docs.ServeSwagger)
	r.GET("/docs", docs.ServeSwagger)
	r.GET("/docs/", docs.ServeSwagger)
	// Serve uploaded diagram images (PDF: 10MB limit enforced on upload)
	if cfg.Upload.Dir != "" {
		r.Static("/uploads", cfg.Upload.Dir)
	}

	pool, err := db.Pool(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("app: db: %w", err)
	}
	jwtIssuer, err := jwt.NewIssuer(&cfg.JWT)
	if err != nil {
		return nil, fmt.Errorf("app: jwt: %w", err)
	}

	// Rate limiting: Redis-backed when Redis.URL set, else in-memory
	var limiter middleware.Limiter
	if cfg.Redis.URL != "" && cfg.RateLimit.Enabled {
		ropts, err := redis.ParseURL(cfg.Redis.URL)
		if err == nil {
			rdb := redis.NewClient(ropts)
			store := middleware.NewRedisStore(rdb)
			limiter = middleware.NewRedisLimiter(store, cfg.RateLimit.RequestsPerMinute, time.Minute)
		} else {
			limiter = middleware.NewMemoryLimiter(cfg.RateLimit.RequestsPerMinute, time.Minute)
		}
	} else {
		limiter = middleware.NewMemoryLimiter(cfg.RateLimit.RequestsPerMinute, time.Minute)
	}
	r.Use(middleware.RateLimit(limiter, jwtIssuer, cfg.RateLimit.RequestsPerMinute, cfg.RateLimit.Enabled))

	// API v1 group (PDF: /api/v1)
	v1 := r.Group("/api/v1")

	authRepo := authrepo.New(pool)
	var passwordResetSender authsvc.PasswordResetSender
	if cfg.PasswordReset.ResendAPIKey != "" && cfg.PasswordReset.FromEmail != "" {
		passwordResetSender = authemail.NewResendSender(cfg.PasswordReset.ResendAPIKey, cfg.PasswordReset.FromEmail)
	}
	authSvc := authsvc.New(authRepo, jwtIssuer, cfg.JWT.AccessDurationMinutes, cfg.JWT.RefreshDurationDays, cfg.PasswordReset.BaseURL, cfg.PasswordReset.ReturnLinkInResponse, passwordResetSender, log)
	authHandler := handler.New(authSvc)
	authHandler.Register(v1)

	workspaceRepo := workspacerepo.New(pool)
	workspaceSvc := workspacesvc.New(workspaceRepo)
	workspaceHandler := workspacehandler.New(workspaceSvc, jwtIssuer)
	workspaceHandler.Register(v1)

	diagramRepo := diagramrepo.New(pool)
	diagramSvc := diagramsvc.New(diagramRepo, workspaceRepo)
	diagramHandler := diagramhandler.New(diagramSvc, jwtIssuer, cfg.Upload, log)
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

	return &App{Router: r, Server: srv, Config: cfg, Log: log}, nil
}

// Run starts the HTTP server and blocks until SIGTERM/SIGINT, then shuts down gracefully.
func (a *App) Run() error {
	addr := a.Server.Addr
	if a.Log != nil {
		a.Log.Info().Str("addr", addr).Msg("server starting")
	}
	go func() {
		if err := a.Server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			if a.Log != nil {
				a.Log.Error().Err(err).Msg("server error")
			} else {
				_, _ = os.Stderr.WriteString("server: " + err.Error() + "\n")
			}
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	if a.Log != nil {
		a.Log.Info().Msg("shutting down")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := a.Server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}
	return nil
}

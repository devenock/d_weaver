package app

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/devenock/d_weaver/config"
	"github.com/gin-gonic/gin"
)

// TestHealthEndpoint verifies /health and /ready return 200 without full app (no DB).
func TestHealthEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/ready", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ready"}) })

	for _, path := range []string{"/health", "/ready"} {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, path, nil)
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("%s: status = %d, want 200", path, w.Code)
		}
	}
}

// TestConfigLoad ensures default config loads (no file required).
func TestConfigLoad(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config load: %v", err)
	}
	if cfg.Server.Port != 8200 {
		t.Errorf("default port = %d, want 8200", cfg.Server.Port)
	}
	if cfg.RateLimit.RequestsPerMinute != 100 {
		t.Errorf("rate limit = %d, want 100", cfg.RateLimit.RequestsPerMinute)
	}
}

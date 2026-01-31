package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/devenock/d_weaver/internal/auth/jwt"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/gin-gonic/gin"
)

// Limiter returns true if the key is within rate limit, false if over limit.
// Key is e.g. "user:uuid" or "ip:1.2.3.4". Caller should increment and check.
type Limiter interface {
	Allow(key string) (allowed bool, err error)
}

// RateLimit returns a Gin middleware that limits by authenticated user ID or by client IP.
// Uses issuer to optionally parse Bearer token for user-based key when Enabled.
func RateLimit(limiter Limiter, issuer *jwt.Issuer, requestsPerMinute int, enabled bool) gin.HandlerFunc {
	if !enabled || requestsPerMinute <= 0 {
		return func(c *gin.Context) { c.Next() }
	}
	return func(c *gin.Context) {
		key := "ip:" + c.ClientIP()
		if issuer != nil {
			auth := c.GetHeader("Authorization")
			if strings.HasPrefix(auth, "Bearer ") {
				tokenString := strings.TrimPrefix(auth, "Bearer ")
				if userID, _, err := issuer.ValidateAccessToken(tokenString); err == nil {
					key = "user:" + userID.String()
				}
			}
		}
		allowed, err := limiter.Allow(key)
		if err != nil {
			c.Next()
			return
		}
		if !allowed {
			common.WriteError(c, http.StatusTooManyRequests, common.ErrorBody{
				Code:    "rate_limit_exceeded",
				Message: "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RedisLimiter implements Limiter using Redis INCR + EXPIRE (fixed window per minute).
type RedisLimiter struct {
	redis  RedisRateLimitStore
	limit  int
	window time.Duration
}

// RedisRateLimitStore is the minimal Redis interface for rate limiting.
type RedisRateLimitStore interface {
	Incr(key string) (int64, error)
	Expire(key string, ttl time.Duration) error
	Get(key string) (string, error)
}

// NewRedisLimiter returns a Limiter that allows limit requests per window (e.g. 100 per minute).
func NewRedisLimiter(store RedisRateLimitStore, limit int, window time.Duration) *RedisLimiter {
	return &RedisLimiter{redis: store, limit: limit, window: window}
}

// Allow increments the key and returns true if under limit.
func (r *RedisLimiter) Allow(key string) (bool, error) {
	key = "rl:" + key
	n, err := r.redis.Incr(key)
	if err != nil {
		return true, err // fail open
	}
	if n == 1 {
		_ = r.redis.Expire(key, r.window)
	}
	return n <= int64(r.limit), nil
}

// MemoryLimiter implements Limiter in-memory (for dev when Redis is not set).
type MemoryLimiter struct {
	mu      sync.Mutex
	counts  map[string]*memWindow
	limit   int
	window  time.Duration
	cleanup time.Time
}

type memWindow struct {
	count int
	until time.Time
}

// NewMemoryLimiter returns an in-memory Limiter.
func NewMemoryLimiter(limit int, window time.Duration) *MemoryLimiter {
	return &MemoryLimiter{
		counts: make(map[string]*memWindow),
		limit:  limit,
		window: window,
	}
}

// Allow returns true if the key is under the limit.
func (m *MemoryLimiter) Allow(key string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	w := m.counts[key]
	if w == nil || now.After(w.until) {
		w = &memWindow{count: 1, until: now.Add(m.window)}
		m.counts[key] = w
		return true, nil
	}
	w.count++
	return w.count <= m.limit, nil
}

// Ensure MemoryLimiter and RedisLimiter are assignable to Limiter.
var _ Limiter = (*RedisLimiter)(nil)
var _ Limiter = (*MemoryLimiter)(nil)

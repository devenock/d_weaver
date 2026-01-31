package middleware

import (
	"time"

	pkglogger "github.com/devenock/d_weaver/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const requestIDKey = "request_id"

// RequestLog returns a Gin middleware that sets X-Request-ID and logs each request (method, path, status, duration).
// If appLog is nil, only sets request ID and skips logging.
func RequestLog(appLog pkglogger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := c.GetHeader("X-Request-ID")
		if rid == "" {
			rid = uuid.New().String()
		}
		c.Set(requestIDKey, rid)
		c.Header("X-Request-ID", rid)
		start := time.Now()
		path := c.Request.URL.Path
		clientIP := c.ClientIP()
		method := c.Request.Method
		c.Next()
		status := c.Writer.Status()
		latency := time.Since(start)
		if appLog != nil {
			appLog.Info().
				Str("request_id", rid).
				Str("method", method).
				Str("path", path).
				Str("client_ip", clientIP).
				Int("status", status).
				Dur("latency_ms", latency).
				Msg("request")
		}
	}
}

// GetRequestID returns the request ID from context, or empty string.
func GetRequestID(c *gin.Context) string {
	v, _ := c.Get(requestIDKey)
	s, _ := v.(string)
	return s
}

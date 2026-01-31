package middleware

import (
	"net/http"
	"strings"

	"github.com/devenock/d_weaver/internal/auth/jwt"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type contextKey string

const UserIDKey contextKey = "user_id"
const UserEmailKey contextKey = "user_email"

// RequireAuth validates the Bearer token and sets user ID and email in context.
// Responds 401 if missing or invalid.
func RequireAuth(issuer *jwt.Issuer) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			common.WriteError(c, http.StatusUnauthorized, common.ErrorBody{
				Code:    common.CodeUnauthorized,
				Message: "Missing or invalid authorization header.",
			})
			c.Abort()
			return
		}
		const prefix = "Bearer "
		if !strings.HasPrefix(auth, prefix) {
			common.WriteError(c, http.StatusUnauthorized, common.ErrorBody{
				Code:    common.CodeUnauthorized,
				Message: "Missing or invalid authorization header.",
			})
			c.Abort()
			return
		}
		tokenString := strings.TrimPrefix(auth, prefix)
		userID, email, err := issuer.ValidateAccessToken(tokenString)
		if err != nil {
			common.WriteError(c, http.StatusUnauthorized, common.ErrorBody{
				Code:    common.CodeUnauthorized,
				Message: "Invalid or expired token.",
			})
			c.Abort()
			return
		}
		c.Set(string(UserIDKey), userID)
		c.Set(string(UserEmailKey), email)
		c.Next()
	}
}

// GetUserID returns the authenticated user's ID from context. Call only after RequireAuth.
func GetUserID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(string(UserIDKey))
	id, _ := v.(uuid.UUID)
	return id
}

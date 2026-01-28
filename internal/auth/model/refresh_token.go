package model

import (
	"time"

	"github.com/google/uuid"
)

// RefreshToken represents a stored refresh token for session management.
type RefreshToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
}

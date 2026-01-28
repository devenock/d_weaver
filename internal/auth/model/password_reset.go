package model

import (
	"time"

	"github.com/google/uuid"
)

// PasswordResetToken represents a token for email-based password recovery (PDF).
type PasswordResetToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	ExpiresAt time.Time
	UsedAt    *time.Time
	CreatedAt time.Time
}

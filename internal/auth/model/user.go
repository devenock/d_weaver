package model

import (
	"time"

	"github.com/google/uuid"
)

// User matches the users table (PDF schema).
type User struct {
	ID           uuid.UUID
	Email        string
	PasswordHash string
	EmailVerified bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

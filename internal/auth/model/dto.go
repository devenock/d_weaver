package model

import (
	"time"

	"github.com/google/uuid"
)

// UserResponse is the safe user shape for API responses (no password_hash).
type UserResponse struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	EmailVerified bool      `json:"email_verified"`
	CreatedAt     time.Time `json:"created_at"`
}

// FromUser builds a UserResponse from a User.
func FromUser(u *User) UserResponse {
	if u == nil {
		return UserResponse{}
	}
	return UserResponse{
		ID:            u.ID,
		Email:         u.Email,
		EmailVerified: u.EmailVerified,
		CreatedAt:     u.CreatedAt,
	}
}

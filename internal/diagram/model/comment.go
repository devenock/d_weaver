package model

import (
	"time"

	"github.com/google/uuid"
)

// Comment matches the comments table (PDF schema).
type Comment struct {
	ID          uuid.UUID
	DiagramID   uuid.UUID
	UserID      uuid.UUID
	CommentText string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

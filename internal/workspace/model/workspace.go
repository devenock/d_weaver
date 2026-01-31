package model

import (
	"time"

	"github.com/google/uuid"
)

// Workspace matches the workspaces table (PDF schema).
type Workspace struct {
	ID          uuid.UUID
	Name        string
	Description string // empty if NULL in DB
	Color       string // empty if NULL in DB
	Tags        []string
	CreatedBy   *uuid.UUID
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

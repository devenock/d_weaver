package model

import (
	"time"

	"github.com/google/uuid"
)

// Diagram matches the diagrams table (PDF schema).
type Diagram struct {
	ID           uuid.UUID
	Title        string
	Content      string
	DiagramType  string
	ImageURL     *string
	IsPublic     bool
	UserID       *uuid.UUID
	WorkspaceID  *uuid.UUID
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

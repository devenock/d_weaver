package model

import (
	"time"

	"github.com/google/uuid"
)

// WorkspaceInvitation matches the workspace_invitations table (PDF: 7-day expiry).
type WorkspaceInvitation struct {
	ID          uuid.UUID
	WorkspaceID uuid.UUID
	Email       string
	Role        Role
	Token       uuid.UUID
	InvitedBy   *uuid.UUID
	ExpiresAt   time.Time
	CreatedAt   time.Time
}

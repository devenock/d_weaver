package model

import (
	"time"

	"github.com/google/uuid"
)

// Role is the workspace member role (PDF: owner, admin, member, viewer).
type Role string

const (
	RoleOwner  Role = "owner"
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
	RoleViewer Role = "viewer"
)

// WorkspaceMember matches the workspace_members table.
type WorkspaceMember struct {
	ID          uuid.UUID
	WorkspaceID uuid.UUID
	UserID      uuid.UUID
	Role        Role
	InvitedBy   *uuid.UUID
	JoinedAt    time.Time
}

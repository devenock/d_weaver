package model

import (
	"time"

	"github.com/google/uuid"
)

// WorkspaceResponse is the workspace shape for API responses.
type WorkspaceResponse struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Color       string     `json:"color"`
	Tags        []string   `json:"tags"`
	CreatedBy   *uuid.UUID `json:"created_by"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// WorkspaceWithRoleResponse is WorkspaceResponse plus the current user's role (for list endpoint).
type WorkspaceWithRoleResponse struct {
	WorkspaceResponse
	Role string `json:"role"`
}

// FromWorkspace builds a WorkspaceResponse from a Workspace.
func FromWorkspace(w *Workspace) WorkspaceResponse {
	if w == nil {
		return WorkspaceResponse{}
	}
	return WorkspaceResponse{
		ID:          w.ID,
		Name:        w.Name,
		Description: w.Description,
		Color:       w.Color,
		Tags:        w.Tags,
		CreatedBy:   w.CreatedBy,
		CreatedAt:   w.CreatedAt,
		UpdatedAt:   w.UpdatedAt,
	}
}

// FromWorkspaceWithRole builds a WorkspaceWithRoleResponse from a Workspace and role.
func FromWorkspaceWithRole(w *Workspace, role Role) WorkspaceWithRoleResponse {
	return WorkspaceWithRoleResponse{
		WorkspaceResponse: FromWorkspace(w),
		Role:              string(role),
	}
}

// MemberResponse is the member shape for API responses (can include user email when joined).
type MemberResponse struct {
	ID          uuid.UUID  `json:"id"`
	WorkspaceID uuid.UUID  `json:"workspace_id"`
	UserID      uuid.UUID  `json:"user_id"`
	Role        string     `json:"role"`
	InvitedBy   *uuid.UUID `json:"invited_by,omitempty"`
	JoinedAt    time.Time  `json:"joined_at"`
}

// FromMember builds a MemberResponse from a WorkspaceMember.
func FromMember(m *WorkspaceMember) MemberResponse {
	if m == nil {
		return MemberResponse{}
	}
	return MemberResponse{
		ID:          m.ID,
		WorkspaceID: m.WorkspaceID,
		UserID:      m.UserID,
		Role:        string(m.Role),
		InvitedBy:   m.InvitedBy,
		JoinedAt:    m.JoinedAt,
	}
}

// InvitationResponse is the invitation shape for API responses.
type InvitationResponse struct {
	ID          uuid.UUID  `json:"id"`
	WorkspaceID uuid.UUID  `json:"workspace_id"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Token       uuid.UUID  `json:"token,omitempty"` // omit in list; include in create response for link
	InvitedBy   *uuid.UUID `json:"invited_by,omitempty"`
	ExpiresAt   time.Time  `json:"expires_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

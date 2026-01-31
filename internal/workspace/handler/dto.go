package handler

// Request DTOs for workspace endpoints (validate with binding tags).

// CreateWorkspaceRequest is the body for POST /api/v1/workspaces.
type CreateWorkspaceRequest struct {
	Name        string   `json:"name" binding:"required,max=255"`
	Description string   `json:"description" binding:"max=4096"`
	Color       string   `json:"color" binding:"max=20"`
	Tags        []string `json:"tags"`
}

// UpdateWorkspaceRequest is the body for PUT /api/v1/workspaces/:id.
type UpdateWorkspaceRequest struct {
	Name        string   `json:"name" binding:"max=255"`
	Description string   `json:"description" binding:"max=4096"`
	Color       string   `json:"color" binding:"max=20"`
	Tags        []string `json:"tags"`
}

// InviteMemberRequest is the body for POST /api/v1/workspaces/:id/invitations.
type InviteMemberRequest struct {
	Email string `json:"email" binding:"required,email,max=255"`
	Role  string `json:"role" binding:"omitempty,oneof=admin member viewer"`
}

// UpdateMemberRoleRequest is the body for PUT /api/v1/workspaces/:id/members/:userId.
type UpdateMemberRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=owner admin member viewer"`
}

// AcceptInvitationRequest is the body for POST /api/v1/invitations/accept.
type AcceptInvitationRequest struct {
	Token string `json:"token" binding:"required"` // UUID string
}

package handler

// Request DTOs for diagram endpoints (validate with binding tags).

// CreateDiagramRequest is the body for POST /api/v1/diagrams.
type CreateDiagramRequest struct {
	Title        string     `json:"title" binding:"required,max=255"`
	Content      string     `json:"content" binding:"required"`
	DiagramType  string     `json:"diagram_type" binding:"required,max=50"`
	IsPublic     bool       `json:"is_public"`
	WorkspaceID  *string    `json:"workspace_id,omitempty"` // UUID string; optional
}

// UpdateDiagramRequest is the body for PUT /api/v1/diagrams/:id.
type UpdateDiagramRequest struct {
	Title       string `json:"title" binding:"max=255"`
	Content     string `json:"content"`
	DiagramType string `json:"diagram_type" binding:"max=50"`
	IsPublic    *bool  `json:"is_public,omitempty"`
}

// AddCommentRequest is the body for POST /api/v1/diagrams/:id/comments.
type AddCommentRequest struct {
	CommentText string `json:"comment_text" binding:"required,max=4096"`
}

// UpdateCommentRequest is the body for PUT /api/v1/diagrams/:id/comments/:commentId.
type UpdateCommentRequest struct {
	CommentText string `json:"comment_text" binding:"required,max=4096"`
}

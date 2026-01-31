package model

import (
	"time"

	"github.com/google/uuid"
)

// DiagramResponse is the diagram shape for API responses.
type DiagramResponse struct {
	ID          uuid.UUID  `json:"id"`
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	DiagramType string     `json:"diagram_type"`
	ImageURL    *string    `json:"image_url,omitempty"`
	IsPublic    bool       `json:"is_public"`
	UserID      *uuid.UUID `json:"user_id,omitempty"`
	WorkspaceID *uuid.UUID `json:"workspace_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// FromDiagram builds a DiagramResponse from a Diagram.
func FromDiagram(d *Diagram) DiagramResponse {
	if d == nil {
		return DiagramResponse{}
	}
	return DiagramResponse{
		ID:          d.ID,
		Title:       d.Title,
		Content:     d.Content,
		DiagramType: d.DiagramType,
		ImageURL:    d.ImageURL,
		IsPublic:    d.IsPublic,
		UserID:      d.UserID,
		WorkspaceID: d.WorkspaceID,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}

// CommentResponse is the comment shape for API responses.
type CommentResponse struct {
	ID          uuid.UUID `json:"id"`
	DiagramID   uuid.UUID `json:"diagram_id"`
	UserID      uuid.UUID `json:"user_id"`
	CommentText string    `json:"comment_text"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// FromComment builds a CommentResponse from a Comment.
func FromComment(c *Comment) CommentResponse {
	if c == nil {
		return CommentResponse{}
	}
	return CommentResponse{
		ID:          c.ID,
		DiagramID:   c.DiagramID,
		UserID:      c.UserID,
		CommentText: c.CommentText,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}
}

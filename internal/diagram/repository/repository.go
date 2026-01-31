package repository

import (
	"context"
	"errors"

	"github.com/devenock/d_weaver/internal/diagram/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository implements diagram and comment persistence.
type Repository struct {
	pool *pgxpool.Pool
}

// New returns a diagram repository using the given pool.
func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func isErrNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Create creates a diagram and returns it.
func (r *Repository) Create(ctx context.Context, title, content, diagramType string, isPublic bool, userID, workspaceID *uuid.UUID) (*model.Diagram, error) {
	var d model.Diagram
	err := r.pool.QueryRow(ctx,
		`INSERT INTO diagrams (title, content, diagram_type, is_public, user_id, workspace_id)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, title, content, diagram_type, image_url, is_public, user_id, workspace_id, created_at, updated_at`,
		title, content, diagramType, isPublic, userID, workspaceID,
	).Scan(&d.ID, &d.Title, &d.Content, &d.DiagramType, &d.ImageURL, &d.IsPublic, &d.UserID, &d.WorkspaceID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// GetByID returns the diagram by id or nil if not found.
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*model.Diagram, error) {
	var d model.Diagram
	err := r.pool.QueryRow(ctx,
		`SELECT id, title, content, diagram_type, image_url, is_public, user_id, workspace_id, created_at, updated_at
		 FROM diagrams WHERE id = $1`,
		id,
	).Scan(&d.ID, &d.Title, &d.Content, &d.DiagramType, &d.ImageURL, &d.IsPublic, &d.UserID, &d.WorkspaceID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

// ListByUserID returns diagrams owned by the user (user_id = userID).
func (r *Repository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Diagram, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, title, content, diagram_type, image_url, is_public, user_id, workspace_id, created_at, updated_at
		 FROM diagrams WHERE user_id = $1 ORDER BY updated_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDiagrams(rows)
}

// ListVisibleByUserID returns diagrams the user can see: owned by user or in a workspace where user is a member.
func (r *Repository) ListVisibleByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Diagram, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT d.id, d.title, d.content, d.diagram_type, d.image_url, d.is_public, d.user_id, d.workspace_id, d.created_at, d.updated_at
		 FROM diagrams d
		 LEFT JOIN workspace_members m ON d.workspace_id = m.workspace_id AND m.user_id = $1
		 WHERE d.user_id = $1 OR m.user_id = $1
		 ORDER BY d.updated_at DESC`,
		userID, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDiagrams(rows)
}

// ListByWorkspaceID returns diagrams in the workspace.
func (r *Repository) ListByWorkspaceID(ctx context.Context, workspaceID uuid.UUID) ([]*model.Diagram, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, title, content, diagram_type, image_url, is_public, user_id, workspace_id, created_at, updated_at
		 FROM diagrams WHERE workspace_id = $1 ORDER BY updated_at DESC`,
		workspaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDiagrams(rows)
}

// ListPublic returns public diagrams (for discovery).
func (r *Repository) ListPublic(ctx context.Context, limit int) ([]*model.Diagram, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx,
		`SELECT id, title, content, diagram_type, image_url, is_public, user_id, workspace_id, created_at, updated_at
		 FROM diagrams WHERE is_public = true ORDER BY updated_at DESC LIMIT $1`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanDiagrams(rows)
}

// Update updates title, content, diagram_type, is_public and returns the diagram.
func (r *Repository) Update(ctx context.Context, id uuid.UUID, title, content, diagramType string, isPublic bool) (*model.Diagram, error) {
	var d model.Diagram
	err := r.pool.QueryRow(ctx,
		`UPDATE diagrams SET title = $1, content = $2, diagram_type = $3, is_public = $4, updated_at = NOW()
		 WHERE id = $5
		 RETURNING id, title, content, diagram_type, image_url, is_public, user_id, workspace_id, created_at, updated_at`,
		title, content, diagramType, isPublic, id,
	).Scan(&d.ID, &d.Title, &d.Content, &d.DiagramType, &d.ImageURL, &d.IsPublic, &d.UserID, &d.WorkspaceID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

// UpdateImageURL sets image_url for the diagram.
func (r *Repository) UpdateImageURL(ctx context.Context, id uuid.UUID, imageURL string) (*model.Diagram, error) {
	var d model.Diagram
	err := r.pool.QueryRow(ctx,
		`UPDATE diagrams SET image_url = $1, updated_at = NOW() WHERE id = $2
		 RETURNING id, title, content, diagram_type, image_url, is_public, user_id, workspace_id, created_at, updated_at`,
		nullStr(imageURL), id,
	).Scan(&d.ID, &d.Title, &d.Content, &d.DiagramType, &d.ImageURL, &d.IsPublic, &d.UserID, &d.WorkspaceID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}

// Delete deletes the diagram and returns true if a row was deleted.
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) (bool, error) {
	cmd, err := r.pool.Exec(ctx, `DELETE FROM diagrams WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	return cmd.RowsAffected() > 0, nil
}

func scanDiagrams(rows pgx.Rows) ([]*model.Diagram, error) {
	var list []*model.Diagram
	for rows.Next() {
		var d model.Diagram
		if err := rows.Scan(&d.ID, &d.Title, &d.Content, &d.DiagramType, &d.ImageURL, &d.IsPublic, &d.UserID, &d.WorkspaceID, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &d)
	}
	return list, rows.Err()
}

// CreateComment creates a comment and returns it.
func (r *Repository) CreateComment(ctx context.Context, diagramID, userID uuid.UUID, commentText string) (*model.Comment, error) {
	var c model.Comment
	err := r.pool.QueryRow(ctx,
		`INSERT INTO comments (diagram_id, user_id, comment_text)
		 VALUES ($1, $2, $3)
		 RETURNING id, diagram_id, user_id, comment_text, created_at, updated_at`,
		diagramID, userID, commentText,
	).Scan(&c.ID, &c.DiagramID, &c.UserID, &c.CommentText, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// GetCommentByID returns the comment by id or nil if not found.
func (r *Repository) GetCommentByID(ctx context.Context, id uuid.UUID) (*model.Comment, error) {
	var c model.Comment
	err := r.pool.QueryRow(ctx,
		`SELECT id, diagram_id, user_id, comment_text, created_at, updated_at
		 FROM comments WHERE id = $1`,
		id,
	).Scan(&c.ID, &c.DiagramID, &c.UserID, &c.CommentText, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// ListCommentsByDiagramID returns comments for the diagram.
func (r *Repository) ListCommentsByDiagramID(ctx context.Context, diagramID uuid.UUID) ([]*model.Comment, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, diagram_id, user_id, comment_text, created_at, updated_at
		 FROM comments WHERE diagram_id = $1 ORDER BY created_at ASC`,
		diagramID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.Comment
	for rows.Next() {
		var c model.Comment
		if err := rows.Scan(&c.ID, &c.DiagramID, &c.UserID, &c.CommentText, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, rows.Err()
}

// UpdateComment updates comment_text and returns the comment.
func (r *Repository) UpdateComment(ctx context.Context, id uuid.UUID, commentText string) (*model.Comment, error) {
	var c model.Comment
	err := r.pool.QueryRow(ctx,
		`UPDATE comments SET comment_text = $1, updated_at = NOW() WHERE id = $2
		 RETURNING id, diagram_id, user_id, comment_text, created_at, updated_at`,
		commentText, id,
	).Scan(&c.ID, &c.DiagramID, &c.UserID, &c.CommentText, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// DeleteComment deletes the comment and returns true if a row was deleted.
func (r *Repository) DeleteComment(ctx context.Context, id uuid.UUID) (bool, error) {
	cmd, err := r.pool.Exec(ctx, `DELETE FROM comments WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	return cmd.RowsAffected() > 0, nil
}

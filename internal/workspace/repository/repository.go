package repository

import (
	"context"
	"errors"

	"github.com/devenock/d_weaver/internal/workspace/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository implements workspace persistence. Parameterized queries only.
type Repository struct {
	pool *pgxpool.Pool
}

// New returns a workspace repository using the given pool.
func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func isErrNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

// Create creates a workspace and adds the creator as owner. Returns the workspace.
func (r *Repository) Create(ctx context.Context, name, description, color string, tags []string, createdBy uuid.UUID) (*model.Workspace, error) {
	var w model.Workspace
	err := r.pool.QueryRow(ctx,
		`INSERT INTO workspaces (name, description, color, tags, created_by)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, name, description, color, tags, created_by, created_at, updated_at`,
		name, nullIfEmpty(description), nullIfEmpty(color), tags, createdBy,
	).Scan(&w.ID, &w.Name, &w.Description, &w.Color, &w.Tags, &w.CreatedBy, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, err
	}
	_, err = r.pool.Exec(ctx,
		`INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
		 VALUES ($1, $2, 'owner', $2)`,
		w.ID, createdBy,
	)
	if err != nil {
		return nil, err
	}
	return &w, nil
}

// GetByID returns the workspace by id or nil if not found.
func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*model.Workspace, error) {
	var w model.Workspace
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, COALESCE(description, ''), COALESCE(color, ''), COALESCE(tags, '{}'), created_by, created_at, updated_at
		 FROM workspaces WHERE id = $1`,
		id,
	).Scan(&w.ID, &w.Name, &w.Description, &w.Color, &w.Tags, &w.CreatedBy, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &w, nil
}

// ListByUserID returns workspaces where the user is a member (via workspace_members).
func (r *Repository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Workspace, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT w.id, w.name, COALESCE(w.description, ''), COALESCE(w.color, ''), COALESCE(w.tags, '{}'), w.created_by, w.created_at, w.updated_at
		 FROM workspaces w
		 INNER JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = $1
		 ORDER BY w.updated_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.Workspace
	for rows.Next() {
		var w model.Workspace
		if err := rows.Scan(&w.ID, &w.Name, &w.Description, &w.Color, &w.Tags, &w.CreatedBy, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &w)
	}
	return list, rows.Err()
}

// Update updates workspace name, description, color, tags. Returns the updated workspace or nil if not found.
func (r *Repository) Update(ctx context.Context, id uuid.UUID, name, description, color string, tags []string) (*model.Workspace, error) {
	result, err := r.pool.Exec(ctx,
		`UPDATE workspaces SET name = COALESCE(NULLIF($2, ''), name), description = $3, color = $4, tags = $5, updated_at = NOW()
		 WHERE id = $1`,
		id, name, nullIfEmpty(description), nullIfEmpty(color), tags,
	)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, nil
	}
	return r.GetByID(ctx, id)
}

// Delete deletes the workspace (cascade deletes members and invitations). Returns true if deleted.
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) (bool, error) {
	result, err := r.pool.Exec(ctx, `DELETE FROM workspaces WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

// GetMember returns the workspace membership for (workspaceID, userID) or nil.
func (r *Repository) GetMember(ctx context.Context, workspaceID, userID uuid.UUID) (*model.WorkspaceMember, error) {
	var m model.WorkspaceMember
	err := r.pool.QueryRow(ctx,
		`SELECT id, workspace_id, user_id, role, invited_by, joined_at
		 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
		workspaceID, userID,
	).Scan(&m.ID, &m.WorkspaceID, &m.UserID, &m.Role, &m.InvitedBy, &m.JoinedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &m, nil
}

// ListMembers returns all members of the workspace.
func (r *Repository) ListMembers(ctx context.Context, workspaceID uuid.UUID) ([]*model.WorkspaceMember, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, workspace_id, user_id, role, invited_by, joined_at
		 FROM workspace_members WHERE workspace_id = $1 ORDER BY joined_at ASC`,
		workspaceID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*model.WorkspaceMember
	for rows.Next() {
		var m model.WorkspaceMember
		if err := rows.Scan(&m.ID, &m.WorkspaceID, &m.UserID, &m.Role, &m.InvitedBy, &m.JoinedAt); err != nil {
			return nil, err
		}
		list = append(list, &m)
	}
	return list, rows.Err()
}

// AddMember inserts a workspace_members row. Returns error on unique violation.
func (r *Repository) AddMember(ctx context.Context, workspaceID, userID uuid.UUID, role model.Role, invitedBy *uuid.UUID) (*model.WorkspaceMember, error) {
	var m model.WorkspaceMember
	err := r.pool.QueryRow(ctx,
		`INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, workspace_id, user_id, role, invited_by, joined_at`,
		workspaceID, userID, string(role), invitedBy,
	).Scan(&m.ID, &m.WorkspaceID, &m.UserID, &m.Role, &m.InvitedBy, &m.JoinedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// UpdateMemberRole updates the member's role. Returns true if updated.
func (r *Repository) UpdateMemberRole(ctx context.Context, workspaceID, userID uuid.UUID, role model.Role) (bool, error) {
	result, err := r.pool.Exec(ctx,
		`UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2`,
		workspaceID, userID, string(role),
	)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

// RemoveMember deletes the workspace_members row. Returns true if removed.
func (r *Repository) RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) (bool, error) {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
		workspaceID, userID,
	)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

// CreateInvitation inserts a workspace_invitation. Returns error on unique (workspace_id, email).
func (r *Repository) CreateInvitation(ctx context.Context, workspaceID uuid.UUID, email string, role model.Role, invitedBy uuid.UUID) (*model.WorkspaceInvitation, error) {
	var inv model.WorkspaceInvitation
	err := r.pool.QueryRow(ctx,
		`INSERT INTO workspace_invitations (workspace_id, email, role, invited_by)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, workspace_id, email, role, token, invited_by, expires_at, created_at`,
		workspaceID, email, string(role), invitedBy,
	).Scan(&inv.ID, &inv.WorkspaceID, &inv.Email, &inv.Role, &inv.Token, &inv.InvitedBy, &inv.ExpiresAt, &inv.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

// GetInvitationByToken returns the invitation and workspace if token is valid and not expired.
func (r *Repository) GetInvitationByToken(ctx context.Context, token uuid.UUID) (*model.WorkspaceInvitation, *model.Workspace, error) {
	var inv model.WorkspaceInvitation
	err := r.pool.QueryRow(ctx,
		`SELECT id, workspace_id, email, role, token, invited_by, expires_at, created_at
		 FROM workspace_invitations WHERE token = $1 AND expires_at > NOW()`,
		token,
	).Scan(&inv.ID, &inv.WorkspaceID, &inv.Email, &inv.Role, &inv.Token, &inv.InvitedBy, &inv.ExpiresAt, &inv.CreatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	w, err := r.GetByID(ctx, inv.WorkspaceID)
	if err != nil || w == nil {
		return nil, nil, err
	}
	return &inv, w, nil
}

// DeleteInvitation deletes the invitation (e.g. after accept). Returns true if deleted.
func (r *Repository) DeleteInvitation(ctx context.Context, id uuid.UUID) (bool, error) {
	result, err := r.pool.Exec(ctx, `DELETE FROM workspace_invitations WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	return result.RowsAffected() > 0, nil
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

package service

import (
	"context"

	"github.com/devenock/d_weaver/internal/common"
	"github.com/devenock/d_weaver/internal/diagram/model"
	wsmodel "github.com/devenock/d_weaver/internal/workspace/model"
	"github.com/google/uuid"
)

// DiagramRepository is the diagram persistence interface.
type DiagramRepository interface {
	Create(ctx context.Context, title, content, diagramType string, isPublic bool, userID, workspaceID *uuid.UUID) (*model.Diagram, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Diagram, error)
	ListVisibleByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Diagram, error)
	ListPublic(ctx context.Context, limit int) ([]*model.Diagram, error)
	Update(ctx context.Context, id uuid.UUID, title, content, diagramType string, isPublic bool) (*model.Diagram, error)
	UpdateImageURL(ctx context.Context, id uuid.UUID, imageURL string) (*model.Diagram, error)
	Delete(ctx context.Context, id uuid.UUID) (bool, error)
	CreateComment(ctx context.Context, diagramID, userID uuid.UUID, commentText string) (*model.Comment, error)
	GetCommentByID(ctx context.Context, id uuid.UUID) (*model.Comment, error)
	ListCommentsByDiagramID(ctx context.Context, diagramID uuid.UUID) ([]*model.Comment, error)
	UpdateComment(ctx context.Context, id uuid.UUID, commentText string) (*model.Comment, error)
	DeleteComment(ctx context.Context, id uuid.UUID) (bool, error)
}

// WorkspaceMemberRepository is a minimal interface for membership checks (implemented by workspace repo).
type WorkspaceMemberRepository interface {
	GetMember(ctx context.Context, workspaceID, userID uuid.UUID) (*wsmodel.WorkspaceMember, error)
}

// Service implements diagram business logic and access control (owner, workspace member, public).
type Service struct {
	repo   DiagramRepository
	wsRepo WorkspaceMemberRepository
}

// New returns a diagram service using the given repositories.
func New(repo DiagramRepository, wsRepo WorkspaceMemberRepository) *Service {
	return &Service{repo: repo, wsRepo: wsRepo}
}

// canAccessDiagram returns nil if user can view the diagram (owner, workspace member, or public).
func (s *Service) canAccessDiagram(ctx context.Context, d *model.Diagram, userID uuid.UUID) error {
	if d.IsPublic {
		return nil
	}
	if d.UserID != nil && *d.UserID == userID {
		return nil
	}
	if d.WorkspaceID != nil {
		m, err := s.wsRepo.GetMember(ctx, *d.WorkspaceID, userID)
		if err != nil {
			return common.NewDomainError(common.CodeInternalError, "Failed to check membership.", err)
		}
		if m != nil {
			return nil
		}
	}
	return common.NewDomainError(common.CodeForbidden, "You do not have access to this diagram.", nil)
}

// canEditDiagram returns nil if user can edit/delete the diagram (owner or workspace admin/owner).
func (s *Service) canEditDiagram(ctx context.Context, d *model.Diagram, userID uuid.UUID) error {
	if d.UserID != nil && *d.UserID == userID {
		return nil
	}
	if d.WorkspaceID != nil {
		m, err := s.wsRepo.GetMember(ctx, *d.WorkspaceID, userID)
		if err != nil {
			return common.NewDomainError(common.CodeInternalError, "Failed to check membership.", err)
		}
		if m != nil && (m.Role == wsmodel.RoleOwner || m.Role == wsmodel.RoleAdmin) {
			return nil
		}
	}
	return common.NewDomainError(common.CodeForbidden, "You do not have permission to edit this diagram.", nil)
}

// CreateDiagram creates a diagram. If workspaceID is set, user must be a member.
func (s *Service) CreateDiagram(ctx context.Context, userID uuid.UUID, workspaceID *uuid.UUID, title, content, diagramType string, isPublic bool) (model.DiagramResponse, error) {
	if workspaceID != nil {
		m, err := s.wsRepo.GetMember(ctx, *workspaceID, userID)
		if err != nil {
			return model.DiagramResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to check membership.", err)
		}
		if m == nil {
			return model.DiagramResponse{}, common.NewDomainError(common.CodeForbidden, "You must be a member of the workspace to create a diagram in it.", nil)
		}
	}
	d, err := s.repo.Create(ctx, title, content, diagramType, isPublic, &userID, workspaceID)
	if err != nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to create diagram.", err)
	}
	return model.FromDiagram(d), nil
}

// CheckDiagramAccess returns nil if the user can access the diagram (for WebSocket join).
func (s *Service) CheckDiagramAccess(ctx context.Context, diagramID, userID uuid.UUID) error {
	d, err := s.repo.GetByID(ctx, diagramID)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to get diagram.", err)
	}
	if d == nil {
		return common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	return s.canAccessDiagram(ctx, d, userID)
}

// GetDiagram returns a diagram if the user has access.
func (s *Service) GetDiagram(ctx context.Context, id, userID uuid.UUID) (model.DiagramResponse, error) {
	d, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to get diagram.", err)
	}
	if d == nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	if err := s.canAccessDiagram(ctx, d, userID); err != nil {
		return model.DiagramResponse{}, err
	}
	return model.FromDiagram(d), nil
}

// ListDiagrams returns diagrams the user can access: personal + workspace (where member).
func (s *Service) ListDiagrams(ctx context.Context, userID uuid.UUID) ([]model.DiagramResponse, error) {
	list, err := s.repo.ListVisibleByUserID(ctx, userID)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to list diagrams.", err)
	}
	out := make([]model.DiagramResponse, len(list))
	for i, d := range list {
		out[i] = model.FromDiagram(d)
	}
	return out, nil
}

// UpdateDiagram updates a diagram if the user has edit permission.
func (s *Service) UpdateDiagram(ctx context.Context, id, userID uuid.UUID, title, content, diagramType string, isPublic bool) (model.DiagramResponse, error) {
	d, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to get diagram.", err)
	}
	if d == nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	if err := s.canEditDiagram(ctx, d, userID); err != nil {
		return model.DiagramResponse{}, err
	}
	updated, err := s.repo.Update(ctx, id, title, content, diagramType, isPublic)
	if err != nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to update diagram.", err)
	}
	return model.FromDiagram(updated), nil
}

// UpdateDiagramImage sets image_url for the diagram (after upload).
func (s *Service) UpdateDiagramImage(ctx context.Context, id, userID uuid.UUID, imageURL string) (model.DiagramResponse, error) {
	d, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to get diagram.", err)
	}
	if d == nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	if err := s.canEditDiagram(ctx, d, userID); err != nil {
		return model.DiagramResponse{}, err
	}
	updated, err := s.repo.UpdateImageURL(ctx, id, imageURL)
	if err != nil {
		return model.DiagramResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to update diagram image.", err)
	}
	return model.FromDiagram(updated), nil
}

// DeleteDiagram deletes a diagram if the user has edit permission.
func (s *Service) DeleteDiagram(ctx context.Context, id, userID uuid.UUID) error {
	d, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to get diagram.", err)
	}
	if d == nil {
		return common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	if err := s.canEditDiagram(ctx, d, userID); err != nil {
		return err
	}
	ok, err := s.repo.Delete(ctx, id)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to delete diagram.", err)
	}
	if !ok {
		return common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	return nil
}

// AddComment adds a comment to a diagram if the user has access.
func (s *Service) AddComment(ctx context.Context, diagramID, userID uuid.UUID, commentText string) (model.CommentResponse, error) {
	d, err := s.repo.GetByID(ctx, diagramID)
	if err != nil {
		return model.CommentResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to get diagram.", err)
	}
	if d == nil {
		return model.CommentResponse{}, common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	if err := s.canAccessDiagram(ctx, d, userID); err != nil {
		return model.CommentResponse{}, err
	}
	c, err := s.repo.CreateComment(ctx, diagramID, userID, commentText)
	if err != nil {
		return model.CommentResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to add comment.", err)
	}
	return model.FromComment(c), nil
}

// ListComments returns comments for a diagram if the user has access.
func (s *Service) ListComments(ctx context.Context, diagramID, userID uuid.UUID) ([]model.CommentResponse, error) {
	d, err := s.repo.GetByID(ctx, diagramID)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to get diagram.", err)
	}
	if d == nil {
		return nil, common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	if err := s.canAccessDiagram(ctx, d, userID); err != nil {
		return nil, err
	}
	list, err := s.repo.ListCommentsByDiagramID(ctx, diagramID)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to list comments.", err)
	}
	out := make([]model.CommentResponse, len(list))
	for i, c := range list {
		out[i] = model.FromComment(c)
	}
	return out, nil
}

// UpdateComment updates a comment if the user is the comment author or can edit the diagram.
func (s *Service) UpdateComment(ctx context.Context, commentID, userID uuid.UUID, commentText string) (model.CommentResponse, error) {
	c, err := s.repo.GetCommentByID(ctx, commentID)
	if err != nil {
		return model.CommentResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to get comment.", err)
	}
	if c == nil {
		return model.CommentResponse{}, common.NewDomainError(common.CodeNotFound, "Comment not found.", nil)
	}
	d, err := s.repo.GetByID(ctx, c.DiagramID)
	if err != nil || d == nil {
		return model.CommentResponse{}, common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	if c.UserID != userID {
		if err := s.canEditDiagram(ctx, d, userID); err != nil {
			return model.CommentResponse{}, err
		}
	}
	updated, err := s.repo.UpdateComment(ctx, commentID, commentText)
	if err != nil {
		return model.CommentResponse{}, common.NewDomainError(common.CodeInternalError, "Failed to update comment.", err)
	}
	return model.FromComment(updated), nil
}

// DeleteComment deletes a comment if the user is the comment author or can edit the diagram.
func (s *Service) DeleteComment(ctx context.Context, commentID, userID uuid.UUID) error {
	c, err := s.repo.GetCommentByID(ctx, commentID)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to get comment.", err)
	}
	if c == nil {
		return common.NewDomainError(common.CodeNotFound, "Comment not found.", nil)
	}
	d, err := s.repo.GetByID(ctx, c.DiagramID)
	if err != nil || d == nil {
		return common.NewDomainError(common.CodeNotFound, "Diagram not found.", nil)
	}
	if c.UserID != userID {
		if err := s.canEditDiagram(ctx, d, userID); err != nil {
			return err
		}
	}
	ok, err := s.repo.DeleteComment(ctx, commentID)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to delete comment.", err)
	}
	if !ok {
		return common.NewDomainError(common.CodeNotFound, "Comment not found.", nil)
	}
	return nil
}

// ListPublic returns public diagrams (for discovery). Limit defaults to 50.
func (s *Service) ListPublic(ctx context.Context, limit int) ([]model.DiagramResponse, error) {
	if limit <= 0 {
		limit = 50
	}
	list, err := s.repo.ListPublic(ctx, limit)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to list public diagrams.", err)
	}
	out := make([]model.DiagramResponse, len(list))
	for i, d := range list {
		out[i] = model.FromDiagram(d)
	}
	return out, nil
}

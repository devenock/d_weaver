package service

import (
	"context"
	"strings"

	"github.com/devenock/d_weaver/internal/common"
	"github.com/devenock/d_weaver/internal/workspace/model"
	"github.com/devenock/d_weaver/pkg/database"
	"github.com/google/uuid"
)

// InvitationEmailSender sends workspace invitation emails (e.g. with join link). Optional.
type InvitationEmailSender interface {
	SendWorkspaceInvitation(toEmail, workspaceName, inviterEmail, joinLink string) error
}

// Repository is the workspace persistence interface.
type Repository interface {
	Create(ctx context.Context, name, description, color string, tags []string, createdBy uuid.UUID) (*model.Workspace, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Workspace, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]*model.Workspace, error)
	ListByUserIDWithRole(ctx context.Context, userID uuid.UUID) ([]*model.Workspace, []model.Role, error)
	Update(ctx context.Context, id uuid.UUID, name, description, color string, tags []string) (*model.Workspace, error)
	Delete(ctx context.Context, id uuid.UUID) (bool, error)
	GetMember(ctx context.Context, workspaceID, userID uuid.UUID) (*model.WorkspaceMember, error)
	ListMembers(ctx context.Context, workspaceID uuid.UUID) ([]*model.WorkspaceMember, error)
	AddMember(ctx context.Context, workspaceID, userID uuid.UUID, role model.Role, invitedBy *uuid.UUID) (*model.WorkspaceMember, error)
	UpdateMemberRole(ctx context.Context, workspaceID, userID uuid.UUID, role model.Role) (bool, error)
	RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) (bool, error)
	CreateInvitation(ctx context.Context, workspaceID uuid.UUID, email string, role model.Role, invitedBy uuid.UUID) (*model.WorkspaceInvitation, error)
	GetInvitationByToken(ctx context.Context, token uuid.UUID) (*model.WorkspaceInvitation, *model.Workspace, error)
	DeleteInvitation(ctx context.Context, id uuid.UUID) (bool, error)
}

// Service implements workspace business logic and RBAC (owner, admin, member, viewer).
type Service struct {
	repo                Repository
	invitationSender    InvitationEmailSender
	invitationBaseURL   string
}

// New returns a workspace service using the given repository.
func New(repo Repository) *Service {
	return &Service{repo: repo}
}

// NewWithInvitationEmail returns a workspace service that sends invitation emails when inviting.
func NewWithInvitationEmail(repo Repository, sender InvitationEmailSender, baseURL string) *Service {
	baseURL = strings.TrimSuffix(baseURL, "/")
	return &Service{repo: repo, invitationSender: sender, invitationBaseURL: baseURL}
}

// EnsureMember returns the member record or ErrForbidden if user is not a member.
func (s *Service) EnsureMember(ctx context.Context, workspaceID, userID uuid.UUID) (*model.WorkspaceMember, error) {
	m, err := s.repo.GetMember(ctx, workspaceID, userID)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to check membership.", err)
	}
	if m == nil {
		return nil, common.NewDomainError(common.CodeForbidden, "You are not a member of this workspace.", nil)
	}
	return m, nil
}

// EnsureAdminOrOwner returns the member or ErrForbidden if role is not admin or owner.
func (s *Service) EnsureAdminOrOwner(m *model.WorkspaceMember) error {
	if m.Role != model.RoleOwner && m.Role != model.RoleAdmin {
		return common.NewDomainError(common.CodeForbidden, "Only owners and admins can perform this action.", nil)
	}
	return nil
}

// EnsureOwner returns nil only if role is owner.
func (s *Service) EnsureOwner(m *model.WorkspaceMember) error {
	if m.Role != model.RoleOwner {
		return common.NewDomainError(common.CodeForbidden, "Only the owner can perform this action.", nil)
	}
	return nil
}

// ListWorkspaces returns workspaces for the user with their role in each (must be a member).
func (s *Service) ListWorkspaces(ctx context.Context, userID uuid.UUID) ([]model.WorkspaceWithRoleResponse, error) {
	workspaces, roles, err := s.repo.ListByUserIDWithRole(ctx, userID)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to list workspaces.", err)
	}
	out := make([]model.WorkspaceWithRoleResponse, len(workspaces))
	for i, w := range workspaces {
		out[i] = model.FromWorkspaceWithRole(w, roles[i])
	}
	return out, nil
}

// CreateWorkspace creates a workspace and adds the user as owner.
func (s *Service) CreateWorkspace(ctx context.Context, userID uuid.UUID, name, description, color string, tags []string) (*model.WorkspaceResponse, error) {
	if name == "" {
		return nil, common.NewDomainError(common.CodeInvalidInput, "Workspace name is required.", nil)
	}
	w, err := s.repo.Create(ctx, name, description, color, tags, userID)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to create workspace.", err)
	}
	resp := model.FromWorkspace(w)
	return &resp, nil
}

// GetWorkspace returns the workspace if the user is a member.
func (s *Service) GetWorkspace(ctx context.Context, workspaceID, userID uuid.UUID) (*model.WorkspaceResponse, error) {
	_, err := s.EnsureMember(ctx, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	w, err := s.repo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to get workspace.", err)
	}
	if w == nil {
		return nil, common.NewDomainError(common.CodeNotFound, "Workspace not found.", nil)
	}
	resp := model.FromWorkspace(w)
	return &resp, nil
}

// UpdateWorkspace updates the workspace; only members can update (any member for now, or restrict to owner/admin).
func (s *Service) UpdateWorkspace(ctx context.Context, workspaceID, userID uuid.UUID, name, description, color string, tags []string) (*model.WorkspaceResponse, error) {
	m, err := s.EnsureMember(ctx, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if err := s.EnsureAdminOrOwner(m); err != nil {
		return nil, err
	}
	w, err := s.repo.Update(ctx, workspaceID, name, description, color, tags)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to update workspace.", err)
	}
	if w == nil {
		return nil, common.NewDomainError(common.CodeNotFound, "Workspace not found.", nil)
	}
	resp := model.FromWorkspace(w)
	return &resp, nil
}

// DeleteWorkspace deletes the workspace; only owner can delete.
func (s *Service) DeleteWorkspace(ctx context.Context, workspaceID, userID uuid.UUID) error {
	m, err := s.EnsureMember(ctx, workspaceID, userID)
	if err != nil {
		return err
	}
	if err := s.EnsureOwner(m); err != nil {
		return err
	}
	ok, err := s.repo.Delete(ctx, workspaceID)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to delete workspace.", err)
	}
	if !ok {
		return common.NewDomainError(common.CodeNotFound, "Workspace not found.", nil)
	}
	return nil
}

// ListMembers returns members of the workspace; caller must be a member.
func (s *Service) ListMembers(ctx context.Context, workspaceID, userID uuid.UUID) ([]model.MemberResponse, error) {
	_, err := s.EnsureMember(ctx, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	list, err := s.repo.ListMembers(ctx, workspaceID)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to list members.", err)
	}
	out := make([]model.MemberResponse, len(list))
	for i, m := range list {
		out[i] = model.FromMember(m)
	}
	return out, nil
}

// InviteMember creates an invitation; only admin or owner can invite. If invitationSender and invitationBaseURL are set, sends an email with a join link. inviterEmail is used in the email body (e.g. "X invited you").
func (s *Service) InviteMember(ctx context.Context, workspaceID, userID uuid.UUID, email string, role model.Role, inviterEmail string) (*model.InvitationResponse, error) {
	m, err := s.EnsureMember(ctx, workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if err := s.EnsureAdminOrOwner(m); err != nil {
		return nil, err
	}
	if email == "" {
		return nil, common.NewDomainError(common.CodeInvalidInput, "Email is required.", nil)
	}
	if role != model.RoleAdmin && role != model.RoleMember && role != model.RoleViewer {
		role = model.RoleMember
	}
	inv, err := s.repo.CreateInvitation(ctx, workspaceID, email, role, userID)
	if err != nil {
		if db.IsUniqueViolation(err) {
			return nil, common.NewDomainError(common.CodeConflict, "An invitation for this email already exists.", err)
		}
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to create invitation.", err)
	}
	if s.invitationSender != nil && s.invitationBaseURL != "" {
		joinLink := s.invitationBaseURL + "/join?token=" + inv.Token.String()
		workspaceName := ""
		if w, _ := s.repo.GetByID(ctx, workspaceID); w != nil {
			workspaceName = w.Name
		}
		if sendErr := s.invitationSender.SendWorkspaceInvitation(inv.Email, workspaceName, inviterEmail, joinLink); sendErr != nil {
			// Log but do not fail the request; invitation is already created
			_ = sendErr
		}
	}
	resp := model.InvitationResponse{
		ID:          inv.ID,
		WorkspaceID: inv.WorkspaceID,
		Email:       inv.Email,
		Role:        string(inv.Role),
		Token:       inv.Token,
		InvitedBy:   inv.InvitedBy,
		ExpiresAt:   inv.ExpiresAt,
		CreatedAt:   inv.CreatedAt,
	}
	return &resp, nil
}

// UpdateMemberRole updates a member's role; only admin or owner can update.
func (s *Service) UpdateMemberRole(ctx context.Context, workspaceID, actorUserID, targetUserID uuid.UUID, role model.Role) (*model.MemberResponse, error) {
	m, err := s.EnsureMember(ctx, workspaceID, actorUserID)
	if err != nil {
		return nil, err
	}
	if err := s.EnsureAdminOrOwner(m); err != nil {
		return nil, err
	}
	// Only owner can assign owner role
	if role == model.RoleOwner && m.Role != model.RoleOwner {
		return nil, common.NewDomainError(common.CodeForbidden, "Only the owner can assign the owner role.", nil)
	}
	ok, err := s.repo.UpdateMemberRole(ctx, workspaceID, targetUserID, role)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to update role.", err)
	}
	if !ok {
		return nil, common.NewDomainError(common.CodeNotFound, "Member not found.", nil)
	}
	updated, err := s.repo.GetMember(ctx, workspaceID, targetUserID)
	if err != nil || updated == nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to get updated member.", err)
	}
	resp := model.FromMember(updated)
	return &resp, nil
}

// RemoveMember removes a member; only admin or owner can remove (owner cannot be removed by admin).
func (s *Service) RemoveMember(ctx context.Context, workspaceID, actorUserID, targetUserID uuid.UUID) error {
	m, err := s.EnsureMember(ctx, workspaceID, actorUserID)
	if err != nil {
		return err
	}
	if err := s.EnsureAdminOrOwner(m); err != nil {
		return err
	}
	target, err := s.repo.GetMember(ctx, workspaceID, targetUserID)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to get member.", err)
	}
	if target == nil {
		return common.NewDomainError(common.CodeNotFound, "Member not found.", nil)
	}
	if target.Role == model.RoleOwner {
		return common.NewDomainError(common.CodeForbidden, "Cannot remove the workspace owner.", nil)
	}
	if m.Role == model.RoleAdmin && target.Role == model.RoleAdmin {
		return common.NewDomainError(common.CodeForbidden, "Admins cannot remove other admins.", nil)
	}
	ok, err := s.repo.RemoveMember(ctx, workspaceID, targetUserID)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to remove member.", err)
	}
	if !ok {
		return common.NewDomainError(common.CodeNotFound, "Member not found.", nil)
	}
	return nil
}

// AcceptInvitation adds the user to the workspace using the invitation token and deletes the invitation. userEmail must match the invitation email (case-insensitive).
func (s *Service) AcceptInvitation(ctx context.Context, userID uuid.UUID, userEmail string, token uuid.UUID) (*model.WorkspaceResponse, error) {
	inv, w, err := s.repo.GetInvitationByToken(ctx, token)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to accept invitation.", err)
	}
	if inv == nil || w == nil {
		return nil, common.NewDomainError(common.CodeNotFound, "Invalid or expired invitation.", nil)
	}
	if userEmail != "" && !strings.EqualFold(inv.Email, userEmail) {
		return nil, common.NewDomainError(common.CodeForbidden, "This invitation was sent to a different email address.", nil)
	}
	_, err = s.repo.AddMember(ctx, inv.WorkspaceID, userID, inv.Role, inv.InvitedBy)
	if err != nil {
		if db.IsUniqueViolation(err) {
			// Already a member; still delete invitation and return workspace
			_, _ = s.repo.DeleteInvitation(ctx, inv.ID)
			resp := model.FromWorkspace(w)
			return &resp, nil
		}
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to join workspace.", err)
	}
	_, _ = s.repo.DeleteInvitation(ctx, inv.ID)
	resp := model.FromWorkspace(w)
	return &resp, nil
}

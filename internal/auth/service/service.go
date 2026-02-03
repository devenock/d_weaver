package service

import (
	"context"
	"strings"
	"time"

	"github.com/devenock/d_weaver/internal/auth/jwt"
	"github.com/devenock/d_weaver/internal/auth/model"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/devenock/d_weaver/pkg/database"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// Repository is the auth persistence interface. Implemented by auth.Repository.
type Repository interface {
	CreateUser(ctx context.Context, email, passwordHash string) (*model.User, error)
	GetUserByEmail(ctx context.Context, email string) (*model.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	CreateRefreshToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (*model.RefreshToken, error)
	GetRefreshTokenByTokenHash(ctx context.Context, tokenHash string) (*model.RefreshToken, *model.User, error)
	RevokeRefreshTokenByHash(ctx context.Context, tokenHash string) error
	CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error
	GetPasswordResetTokenByTokenHash(ctx context.Context, tokenHash string) (*model.PasswordResetToken, *model.User, error)
	MarkPasswordResetUsed(ctx context.Context, id uuid.UUID) error
	UpdateUserPassword(ctx context.Context, userID uuid.UUID, passwordHash string) error
}

// PasswordResetSender sends the password reset link by email. Implementations can use Resend, etc.
type PasswordResetSender interface {
	SendPasswordReset(toEmail, resetLink string) error
}

// Service implements auth business logic. Calls Repository and JWT/hash helpers.
type Service struct {
	repo                    Repository
	jwt                     *jwt.Issuer
	accessDur               time.Duration
	refreshDur              time.Duration
	passwordResetBaseURL    string
	passwordResetReturnLink bool
	passwordResetSender     PasswordResetSender
}

// New returns an auth service that uses the given repository and JWT issuer.
// passwordResetBaseURL and passwordResetReturnLink are optional: when both set, ForgotPassword
// can return a reset link in the response (e.g. for dev when email is not configured).
// passwordResetSender is optional: when set, ForgotPassword sends the reset link by email (e.g. via Resend).
func New(repo Repository, jwtIssuer *jwt.Issuer, accessMinutes, refreshDays int, passwordResetBaseURL string, passwordResetReturnLink bool, passwordResetSender PasswordResetSender) *Service {
	return &Service{
		repo:                    repo,
		jwt:                     jwtIssuer,
		accessDur:               time.Duration(accessMinutes) * time.Minute,
		refreshDur:              time.Duration(refreshDays) * 24 * time.Hour,
		passwordResetBaseURL:    strings.TrimSuffix(passwordResetBaseURL, "/"),
		passwordResetReturnLink: passwordResetReturnLink && passwordResetBaseURL != "",
		passwordResetSender:     passwordResetSender,
	}
}

// RegisterResult is returned from Register.
type RegisterResult struct {
	User         model.UserResponse `json:"user"`
	AccessToken  string             `json:"access_token"`
	RefreshToken string             `json:"refresh_token"`
	ExpiresIn    int                `json:"expires_in"` // seconds
}

// Register creates a user and returns tokens (PDF: email/password auth).
func (s *Service) Register(ctx context.Context, email, password string) (*RegisterResult, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to secure password.", err)
	}
	u, err := s.repo.CreateUser(ctx, email, string(hash))
	if err != nil {
		if db.IsUniqueViolation(err) {
			return nil, common.NewDomainError(common.CodeConflict, "An account with this email already exists.", err)
		}
		return nil, common.NewDomainError(common.CodeInternalError, "Registration failed.", err)
	}
	access, err := s.jwt.IssueAccessToken(u.ID, u.Email)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to issue token.", err)
	}
	plainRef, hashRef, err := jwt.GenerateRefreshToken()
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to generate refresh token.", err)
	}
	expAt := time.Now().Add(s.refreshDur)
	if _, err := s.repo.CreateRefreshToken(ctx, u.ID, hashRef, expAt); err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to store refresh token.", err)
	}
	return &RegisterResult{
		User:         model.FromUser(u),
		AccessToken:  access,
		RefreshToken: plainRef,
		ExpiresIn:    int(s.accessDur.Seconds()),
	}, nil
}

// LoginResult is returned from Login.
type LoginResult struct {
	User         model.UserResponse `json:"user"`
	AccessToken  string              `json:"access_token"`
	RefreshToken string              `json:"refresh_token"`
	ExpiresIn    int                 `json:"expires_in"`
}

// Login validates credentials and returns tokens.
func (s *Service) Login(ctx context.Context, email, password string) (*LoginResult, error) {
	u, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Login failed.", err)
	}
	if u == nil {
		return nil, common.NewDomainError(common.CodeUnauthorized, "Invalid email or password.", nil)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, common.NewDomainError(common.CodeUnauthorized, "Invalid email or password.", nil)
	}
	access, err := s.jwt.IssueAccessToken(u.ID, u.Email)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to issue token.", err)
	}
	plainRef, hashRef, err := jwt.GenerateRefreshToken()
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to generate refresh token.", err)
	}
	expAt := time.Now().Add(s.refreshDur)
	if _, err := s.repo.CreateRefreshToken(ctx, u.ID, hashRef, expAt); err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to store refresh token.", err)
	}
	return &LoginResult{
		User:         model.FromUser(u),
		AccessToken:  access,
		RefreshToken: plainRef,
		ExpiresIn:    int(s.accessDur.Seconds()),
	}, nil
}

// Logout revokes the refresh token (PDF: session management).
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	_, hash, err := hashRefreshToken(refreshToken)
	if err != nil {
		return common.NewDomainError(common.CodeInvalidInput, "Invalid refresh token.", err)
	}
	if err := s.repo.RevokeRefreshTokenByHash(ctx, hash); err != nil {
		return common.NewDomainError(common.CodeInternalError, "Logout failed.", err)
	}
	return nil
}

// RefreshResult is returned from Refresh.
type RefreshResult struct {
	User         model.UserResponse `json:"user"`
	AccessToken  string             `json:"access_token"`
	RefreshToken string             `json:"refresh_token"`
	ExpiresIn    int                `json:"expires_in"`
}

// Refresh validates the refresh token and returns a new access/refresh pair (PDF: token refresh).
func (s *Service) Refresh(ctx context.Context, refreshToken string) (*RefreshResult, error) {
	_, hash, err := hashRefreshToken(refreshToken)
	if err != nil {
		return nil, common.NewDomainError(common.CodeUnauthorized, "Invalid or expired refresh token.", err)
	}
	_, u, err := s.repo.GetRefreshTokenByTokenHash(ctx, hash)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Refresh failed.", err)
	}
	if u == nil {
		return nil, common.NewDomainError(common.CodeUnauthorized, "Invalid or expired refresh token.", nil)
	}
	access, err := s.jwt.IssueAccessToken(u.ID, u.Email)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to issue token.", err)
	}
	plainRef, hashRef, err := jwt.GenerateRefreshToken()
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to generate refresh token.", err)
	}
	expAt := time.Now().Add(s.refreshDur)
	if _, err := s.repo.CreateRefreshToken(ctx, u.ID, hashRef, expAt); err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Failed to store refresh token.", err)
	}
	if err := s.repo.RevokeRefreshTokenByHash(ctx, hash); err != nil {
		// non-fatal: new token already issued
		_ = err
	}
	return &RefreshResult{
		User:         model.FromUser(u),
		AccessToken:  access,
		RefreshToken: plainRef,
		ExpiresIn:    int(s.accessDur.Seconds()),
	}, nil
}

// ForgotPasswordResult is returned when ReturnLinkInResponse is true (e.g. dev mode).
type ForgotPasswordResult struct {
	ResetLink string `json:"reset_link"`
}

// ForgotPassword creates a reset token (PDF: email-based recovery). When passwordResetReturnLink
// is true and base URL is set, returns the reset link for the client (e.g. dev without email).
// Otherwise the link should be sent by email (not implemented here).
func (s *Service) ForgotPassword(ctx context.Context, email string) (*ForgotPasswordResult, error) {
	u, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Request failed.", err)
	}
	if u == nil {
		// Do not leak existence: succeed with no-op
		return nil, nil
	}
	plain, hash, err := jwt.GenerateRefreshToken() // reuse token generator for reset tokens
	if err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Request failed.", err)
	}
	expAt := time.Now().Add(7 * 24 * time.Hour) // 7 days per PDF
	if err := s.repo.CreatePasswordResetToken(ctx, u.ID, hash, expAt); err != nil {
		return nil, common.NewDomainError(common.CodeInternalError, "Request failed.", err)
	}
	resetLink := ""
	if s.passwordResetBaseURL != "" {
		resetLink = s.passwordResetBaseURL + "/reset-password?token=" + plain
	}
	if s.passwordResetSender != nil && resetLink != "" {
		_ = s.passwordResetSender.SendPasswordReset(u.Email, resetLink)
	}
	var result *ForgotPasswordResult
	if s.passwordResetReturnLink && resetLink != "" {
		result = &ForgotPasswordResult{ResetLink: resetLink}
	}
	return result, nil
}

// ResetPassword sets a new password using the reset token (PDF: reset password).
func (s *Service) ResetPassword(ctx context.Context, token, newPassword string) error {
	_, hash, err := hashRefreshToken(token)
	if err != nil {
		return common.NewDomainError(common.CodeInvalidInput, "Invalid or expired reset link.", err)
	}
	t, u, err := s.repo.GetPasswordResetTokenByTokenHash(ctx, hash)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Reset failed.", err)
	}
	if t == nil || u == nil {
		return common.NewDomainError(common.CodeInvalidInput, "Invalid or expired reset link.", nil)
	}
	hashPw, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return common.NewDomainError(common.CodeInternalError, "Failed to secure password.", err)
	}
	if err := s.repo.UpdateUserPassword(ctx, u.ID, string(hashPw)); err != nil {
		return common.NewDomainError(common.CodeInternalError, "Reset failed.", err)
	}
	if err := s.repo.MarkPasswordResetUsed(ctx, t.ID); err != nil {
		_ = err
	}
	return nil
}

func hashRefreshToken(plain string) (_, hash string, err error) {
	return plain, jwt.HashRefreshToken(plain), nil
}

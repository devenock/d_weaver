package service

import (
	"context"
	"testing"
	"time"

	"github.com/devenock/d_weaver/config"
	"github.com/devenock/d_weaver/internal/auth/jwt"
	"github.com/devenock/d_weaver/internal/auth/model"
	"github.com/devenock/d_weaver/internal/common"
	db "github.com/devenock/d_weaver/pkg/database"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

// mockRepo implements Repository for tests. Set fields to control behavior.
type mockRepo struct {
	createUserErr                  error
	getUserByEmailUser             *model.User
	getUserByEmailErr              error
	createRefreshTokenErr          error
	getRefreshTokenByTokenHashUser *model.User
	getRefreshTokenByTokenHashErr  error
	revokeRefreshTokenByHashErr    error
	createPasswordResetTokenErr    error
	getPasswordResetTokenUser      *model.User
	getPasswordResetTokenToken     *model.PasswordResetToken
	getPasswordResetTokenErr       error
	updateUserPasswordErr          error
	markPasswordResetUsedErr       error
}

func (m *mockRepo) CreateUser(ctx context.Context, email, passwordHash string) (*model.User, error) {
	if m.createUserErr != nil {
		return nil, m.createUserErr
	}
	return &model.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}, nil
}

func (m *mockRepo) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	if m.getUserByEmailErr != nil {
		return nil, m.getUserByEmailErr
	}
	return m.getUserByEmailUser, nil
}

func (m *mockRepo) GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return nil, nil
}

func (m *mockRepo) CreateRefreshToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (*model.RefreshToken, error) {
	if m.createRefreshTokenErr != nil {
		return nil, m.createRefreshTokenErr
	}
	return &model.RefreshToken{ID: uuid.New(), UserID: userID, TokenHash: tokenHash, ExpiresAt: expiresAt, CreatedAt: time.Now()}, nil
}

func (m *mockRepo) GetRefreshTokenByTokenHash(ctx context.Context, tokenHash string) (*model.RefreshToken, *model.User, error) {
	if m.getRefreshTokenByTokenHashErr != nil {
		return nil, nil, m.getRefreshTokenByTokenHashErr
	}
	if m.getRefreshTokenByTokenHashUser == nil {
		return nil, nil, nil
	}
	return &model.RefreshToken{ID: uuid.New()}, m.getRefreshTokenByTokenHashUser, nil
}

func (m *mockRepo) RevokeRefreshTokenByHash(ctx context.Context, tokenHash string) error {
	return m.revokeRefreshTokenByHashErr
}

func (m *mockRepo) CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	return m.createPasswordResetTokenErr
}

func (m *mockRepo) GetPasswordResetTokenByTokenHash(ctx context.Context, tokenHash string) (*model.PasswordResetToken, *model.User, error) {
	if m.getPasswordResetTokenErr != nil {
		return nil, nil, m.getPasswordResetTokenErr
	}
	if m.getPasswordResetTokenToken == nil || m.getPasswordResetTokenUser == nil {
		return nil, nil, nil
	}
	return m.getPasswordResetTokenToken, m.getPasswordResetTokenUser, nil
}

func (m *mockRepo) MarkPasswordResetUsed(ctx context.Context, id uuid.UUID) error {
	return m.markPasswordResetUsedErr
}

func (m *mockRepo) UpdateUserPassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	return m.updateUserPasswordErr
}

func testJWTIssuer(t *testing.T) *jwt.Issuer {
	t.Helper()
	issuer, err := jwt.NewIssuer(&config.JWTConfig{
		AccessDurationMinutes: 15,
		RefreshDurationDays:   7,
		RefreshTokenSecret:    "test-secret",
	})
	if err != nil {
		t.Fatalf("jwt.NewIssuer: %v", err)
	}
	return issuer
}

func TestService_Register_Success(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepo{}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "", false, nil, nil)

	res, err := svc.Register(ctx, "user@example.com", "password123")
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if res == nil {
		t.Fatal("expected result")
	}
	if res.User.Email != "user@example.com" {
		t.Errorf("user email = %q, want user@example.com", res.User.Email)
	}
	if res.AccessToken == "" || res.RefreshToken == "" {
		t.Error("expected access and refresh tokens")
	}
	if res.ExpiresIn != 15*60 {
		t.Errorf("expires_in = %d, want 900", res.ExpiresIn)
	}
}

func TestService_Register_DuplicateEmail(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepo{
		createUserErr: &pgconn.PgError{Code: db.PgCodeUniqueViolation},
	}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "", false, nil, nil)

	res, err := svc.Register(ctx, "user@example.com", "password123")
	if err == nil {
		t.Fatal("expected error for duplicate email")
	}
	if res != nil {
		t.Error("expected nil result")
	}
	derr, ok := err.(*common.DomainError)
	if !ok {
		t.Fatalf("expected DomainError, got %T", err)
	}
	if derr.Code != common.CodeConflict {
		t.Errorf("code = %q, want %q", derr.Code, common.CodeConflict)
	}
}

func TestService_Login_Success(t *testing.T) {
	ctx := context.Background()
	hash, _ := hashPassword("password123")
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: hash, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	repo := &mockRepo{
		getUserByEmailUser: user,
	}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "", false, nil, nil)

	res, err := svc.Login(ctx, "user@example.com", "password123")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	if res.User.Email != "user@example.com" {
		t.Errorf("user email = %q", res.User.Email)
	}
	if res.AccessToken == "" || res.RefreshToken == "" {
		t.Error("expected tokens")
	}
}

func TestService_Login_UserNotFound(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepo{getUserByEmailUser: nil}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "", false, nil, nil)

	res, err := svc.Login(ctx, "nobody@example.com", "password123")
	if err == nil {
		t.Fatal("expected error")
	}
	if res != nil {
		t.Error("expected nil result")
	}
	derr, ok := err.(*common.DomainError)
	if !ok || derr.Code != common.CodeUnauthorized {
		t.Errorf("expected unauthorized, got %v", err)
	}
}

func TestService_Login_WrongPassword(t *testing.T) {
	ctx := context.Background()
	hash, _ := hashPassword("correct")
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: hash, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	repo := &mockRepo{getUserByEmailUser: user}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "", false, nil, nil)

	_, err := svc.Login(ctx, "user@example.com", "wrong")
	if err == nil {
		t.Fatal("expected error for wrong password")
	}
	derr, ok := err.(*common.DomainError)
	if !ok || derr.Code != common.CodeUnauthorized {
		t.Errorf("expected unauthorized, got %v", err)
	}
}

func TestService_ForgotPassword_UnknownEmail_NoLeak(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepo{getUserByEmailUser: nil}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "http://localhost:3000", true, nil, nil)

	res, err := svc.ForgotPassword(ctx, "unknown@example.com")
	if err != nil {
		t.Fatalf("ForgotPassword: %v", err)
	}
	// Should succeed with nil result (no reset link) to avoid leaking existence
	if res != nil {
		t.Errorf("expected nil result for unknown email, got %+v", res)
	}
}

func TestService_ForgotPassword_KnownUser_ReturnLink(t *testing.T) {
	ctx := context.Background()
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: "hash", CreatedAt: time.Now(), UpdatedAt: time.Now()}
	repo := &mockRepo{getUserByEmailUser: user}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "http://localhost:3000", true, nil, nil)

	res, err := svc.ForgotPassword(ctx, "user@example.com")
	if err != nil {
		t.Fatalf("ForgotPassword: %v", err)
	}
	if res == nil || res.ResetLink == "" {
		t.Fatalf("expected reset link, got %+v", res)
	}
	if res.ResetLink[:len("http://localhost:3000/reset-password?token=")] != "http://localhost:3000/reset-password?token=" {
		t.Errorf("reset link format: %s", res.ResetLink)
	}
}

func TestService_ResetPassword_InvalidToken(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepo{getPasswordResetTokenToken: nil, getPasswordResetTokenUser: nil}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "", false, nil, nil)

	// Token that hashes to something the mock will return nil for
	err := svc.ResetPassword(ctx, "invalid-token", "newpassword")
	if err == nil {
		t.Fatal("expected error for invalid token")
	}
	derr, ok := err.(*common.DomainError)
	if !ok || derr.Code != common.CodeInvalidInput {
		t.Errorf("expected invalid_input, got %v", err)
	}
}

func TestService_Logout_Success(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepo{}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "", false, nil, nil)

	err := svc.Logout(ctx, "some-refresh-token")
	if err != nil {
		t.Fatalf("Logout: %v", err)
	}
}

func TestService_Refresh_InvalidToken(t *testing.T) {
	ctx := context.Background()
	repo := &mockRepo{getRefreshTokenByTokenHashUser: nil}
	issuer := testJWTIssuer(t)
	svc := New(repo, issuer, 15, 7, "", false, nil, nil)

	res, err := svc.Refresh(ctx, "any-token")
	if err == nil {
		t.Fatal("expected error for invalid/unknown token")
	}
	if res != nil {
		t.Error("expected nil result")
	}
	derr, ok := err.(*common.DomainError)
	if !ok || derr.Code != common.CodeUnauthorized {
		t.Errorf("expected unauthorized, got %v", err)
	}
}

// hashPassword is a helper that matches service's bcrypt usage (same as in Register).
func hashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}

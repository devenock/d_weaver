package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/devenock/d_weaver/internal/auth/model"
	"github.com/devenock/d_weaver/internal/auth/service"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// fakeAuthService implements AuthService with configurable behavior per test.
type fakeAuthService struct {
	registerFunc        func(context.Context, string, string) (*service.RegisterResult, error)
	loginFunc           func(context.Context, string, string) (*service.LoginResult, error)
	logoutFunc          func(context.Context, string) error
	refreshFunc         func(context.Context, string) (*service.RefreshResult, error)
	forgotPasswordFunc  func(context.Context, string) (*service.ForgotPasswordResult, error)
	resetPasswordFunc   func(context.Context, string, string) error
}

func (f *fakeAuthService) Register(ctx context.Context, email, password string) (*service.RegisterResult, error) {
	if f.registerFunc != nil {
		return f.registerFunc(ctx, email, password)
	}
	return nil, common.NewDomainError(common.CodeInternalError, "not implemented", nil)
}

func (f *fakeAuthService) Login(ctx context.Context, email, password string) (*service.LoginResult, error) {
	if f.loginFunc != nil {
		return f.loginFunc(ctx, email, password)
	}
	return nil, common.NewDomainError(common.CodeInternalError, "not implemented", nil)
}

func (f *fakeAuthService) Logout(ctx context.Context, refreshToken string) error {
	if f.logoutFunc != nil {
		return f.logoutFunc(ctx, refreshToken)
	}
	return nil
}

func (f *fakeAuthService) Refresh(ctx context.Context, refreshToken string) (*service.RefreshResult, error) {
	if f.refreshFunc != nil {
		return f.refreshFunc(ctx, refreshToken)
	}
	return nil, common.NewDomainError(common.CodeInternalError, "not implemented", nil)
}

func (f *fakeAuthService) ForgotPassword(ctx context.Context, email string) (*service.ForgotPasswordResult, error) {
	if f.forgotPasswordFunc != nil {
		return f.forgotPasswordFunc(ctx, email)
	}
	return nil, nil
}

func (f *fakeAuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if f.resetPasswordFunc != nil {
		return f.resetPasswordFunc(ctx, token, newPassword)
	}
	return nil
}

func setupRouter(t *testing.T, svc AuthService) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	v1 := r.Group("/api/v1")
	h := New(svc)
	h.Register(v1)
	return r
}

func TestHandler_Register_Success(t *testing.T) {
	userID := uuid.New()
	svc := &fakeAuthService{
		registerFunc: func(ctx context.Context, email, password string) (*service.RegisterResult, error) {
			return &service.RegisterResult{
				User:         model.UserResponse{ID: userID, Email: email, CreatedAt: time.Now()},
				AccessToken:  "access",
				RefreshToken: "refresh",
				ExpiresIn:    900,
			}, nil
		},
	}
	r := setupRouter(t, svc)

	body := map[string]string{"email": "user@example.com", "password": "password123"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("status = %d, want 201", w.Code)
	}
	var envelope common.SuccessBody
	if err := json.NewDecoder(w.Body).Decode(&envelope); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if envelope.Data == nil {
		t.Error("expected data")
	}
}

func TestHandler_Register_InvalidInput(t *testing.T) {
	svc := &fakeAuthService{}
	r := setupRouter(t, svc)

	body := map[string]string{"email": "not-an-email", "password": "short"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestHandler_Register_Conflict(t *testing.T) {
	svc := &fakeAuthService{
		registerFunc: func(ctx context.Context, email, password string) (*service.RegisterResult, error) {
			return nil, common.NewDomainError(common.CodeConflict, "An account with this email already exists.", nil)
		},
	}
	r := setupRouter(t, svc)

	body := map[string]string{"email": "existing@example.com", "password": "password123"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("status = %d, want 409", w.Code)
	}
	var errBody common.ErrorBody
	if err := json.NewDecoder(w.Body).Decode(&errBody); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if errBody.Code != common.CodeConflict {
		t.Errorf("code = %q, want %q", errBody.Code, common.CodeConflict)
	}
}

func TestHandler_Login_Success(t *testing.T) {
	userID := uuid.New()
	svc := &fakeAuthService{
		loginFunc: func(ctx context.Context, email, password string) (*service.LoginResult, error) {
			return &service.LoginResult{
				User:         model.UserResponse{ID: userID, Email: email, CreatedAt: time.Now()},
				AccessToken:  "access",
				RefreshToken: "refresh",
				ExpiresIn:    900,
			}, nil
		},
	}
	r := setupRouter(t, svc)

	body := map[string]string{"email": "user@example.com", "password": "password123"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestHandler_Login_Unauthorized(t *testing.T) {
	svc := &fakeAuthService{
		loginFunc: func(ctx context.Context, email, password string) (*service.LoginResult, error) {
			return nil, common.NewDomainError(common.CodeUnauthorized, "Invalid email or password.", nil)
		},
	}
	r := setupRouter(t, svc)

	body := map[string]string{"email": "user@example.com", "password": "wrong"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestHandler_Logout_Success(t *testing.T) {
	svc := &fakeAuthService{logoutFunc: func(ctx context.Context, refreshToken string) error { return nil }}
	r := setupRouter(t, svc)

	body := map[string]string{"refresh_token": "some-token"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("status = %d, want 204", w.Code)
	}
}

func TestHandler_ForgotPassword_NoContent(t *testing.T) {
	svc := &fakeAuthService{
		forgotPasswordFunc: func(ctx context.Context, email string) (*service.ForgotPasswordResult, error) {
			return nil, nil
		},
	}
	r := setupRouter(t, svc)

	body := map[string]string{"email": "user@example.com"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("status = %d, want 204", w.Code)
	}
}

func TestHandler_ForgotPassword_OKWithResetLink(t *testing.T) {
	svc := &fakeAuthService{
		forgotPasswordFunc: func(ctx context.Context, email string) (*service.ForgotPasswordResult, error) {
			return &service.ForgotPasswordResult{ResetLink: "http://localhost:3000/reset-password?token=abc"}, nil
		},
	}
	r := setupRouter(t, svc)

	body := map[string]string{"email": "user@example.com"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	var envelope common.SuccessBody
	if err := json.NewDecoder(w.Body).Decode(&envelope); err != nil {
		t.Fatalf("decode: %v", err)
	}
}

func TestHandler_ResetPassword_Success(t *testing.T) {
	svc := &fakeAuthService{
		resetPasswordFunc: func(ctx context.Context, token, newPassword string) error { return nil },
	}
	r := setupRouter(t, svc)

	body := map[string]string{"token": "reset-token", "new_password": "newpassword123"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/reset-password", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("status = %d, want 204", w.Code)
	}
}

func TestHandler_ResetPassword_InvalidToken(t *testing.T) {
	svc := &fakeAuthService{
		resetPasswordFunc: func(ctx context.Context, token, newPassword string) error {
			return common.NewDomainError(common.CodeInvalidInput, "Invalid or expired reset link.", nil)
		},
	}
	r := setupRouter(t, svc)

	body := map[string]string{"token": "bad", "new_password": "newpassword123"}
	bodyBytes, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/reset-password", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

package handler

import (
	"context"
	"net/http"

	"github.com/devenock/d_weaver/internal/auth/service"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/gin-gonic/gin"
)

// Handler handles HTTP for auth (register, login, logout, refresh, forgot-password, reset-password).
// Delegates all business logic to AuthService.
type Handler struct {
	svc AuthService
}

// AuthService is the auth business logic interface. Implemented by *service.Service.
type AuthService interface {
	Register(ctx context.Context, email, password string) (*service.RegisterResult, error)
	Login(ctx context.Context, email, password string) (*service.LoginResult, error)
	Logout(ctx context.Context, refreshToken string) error
	Refresh(ctx context.Context, refreshToken string) (*service.RefreshResult, error)
	ForgotPassword(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, newPassword string) error
}

// New returns an auth HTTP handler that uses the given service.
func New(svc AuthService) *Handler {
	return &Handler{svc: svc}
}

// Register mounts auth routes on g. Paths match PDF: /api/v1/auth/*
func (h *Handler) Register(g *gin.RouterGroup) {
	auth := g.Group("/auth")
	auth.POST("/register", h.register)
	auth.POST("/login", h.login)
	auth.POST("/logout", h.logout)
	auth.POST("/refresh", h.refresh)
	auth.POST("/forgot-password", h.forgotPassword)
	auth.POST("/reset-password", h.resetPassword)
}

func (h *Handler) register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{
			Code:    common.CodeInvalidInput,
			Message: "Invalid or missing input.",
			Details: map[string]interface{}{"error": err.Error()},
		})
		return
	}
	res, err := h.svc.Register(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteCreated(c, res)
}

func (h *Handler) login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{
			Code:    common.CodeInvalidInput,
			Message: "Invalid or missing input.",
			Details: map[string]interface{}{"error": err.Error()},
		})
		return
	}
	res, err := h.svc.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, res)
}

func (h *Handler) logout(c *gin.Context) {
	var req LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{
			Code:    common.CodeInvalidInput,
			Message: "Invalid or missing input.",
			Details: map[string]interface{}{"error": err.Error()},
		})
		return
	}
	if err := h.svc.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteNoContent(c)
}

func (h *Handler) refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{
			Code:    common.CodeInvalidInput,
			Message: "Invalid or missing input.",
			Details: map[string]interface{}{"error": err.Error()},
		})
		return
	}
	res, err := h.svc.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, res)
}

func (h *Handler) forgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{
			Code:    common.CodeInvalidInput,
			Message: "Invalid or missing input.",
			Details: map[string]interface{}{"error": err.Error()},
		})
		return
	}
	if err := h.svc.ForgotPassword(c.Request.Context(), req.Email); err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteNoContent(c)
}

func (h *Handler) resetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{
			Code:    common.CodeInvalidInput,
			Message: "Invalid or missing input.",
			Details: map[string]interface{}{"error": err.Error()},
		})
		return
	}
	if err := h.svc.ResetPassword(c.Request.Context(), req.Token, req.NewPassword); err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteNoContent(c)
}

package handler

import (
	"github.com/gin-gonic/gin"
)

// Handler handles HTTP for auth (register, login, logout, refresh, forgot-password, reset-password).
// Delegates all business logic to Service.
type Handler struct {
	svc AuthService
}

// AuthService is the auth business logic interface. Implemented by auth.Service.
// Add Register, Login, Logout, Refresh, ForgotPassword, ResetPassword when implementing.
type AuthService interface{}

// New returns an auth HTTP handler that uses the given service.
func New(svc AuthService) *Handler {
	return &Handler{svc: svc}
}

// Register mounts auth routes on g. Paths must match PDF: /api/v1/auth/*
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
	// TODO: bind body, validate, call h.svc, write response/error
	c.Status(501)
}

func (h *Handler) login(c *gin.Context) {
	c.Status(501)
}

func (h *Handler) logout(c *gin.Context) {
	c.Status(501)
}

func (h *Handler) refresh(c *gin.Context) {
	c.Status(501)
}

func (h *Handler) forgotPassword(c *gin.Context) {
	c.Status(501)
}

func (h *Handler) resetPassword(c *gin.Context) {
	c.Status(501)
}

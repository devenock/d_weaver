package handler

import (
	"net/http"

	"github.com/devenock/d_weaver/internal/auth/jwt"
	"github.com/devenock/d_weaver/internal/auth/middleware"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/devenock/d_weaver/internal/workspace/model"
	"github.com/devenock/d_weaver/internal/workspace/service"
	"github.com/devenock/d_weaver/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Handler handles HTTP for workspaces and invitations. Uses RequireAuth with the given JWT issuer.
type Handler struct {
	svc    *service.Service
	issuer *jwt.Issuer
	log    logger.Logger
}

// New returns a workspace HTTP handler. Pass the JWT issuer for RequireAuth.
func New(svc *service.Service, issuer *jwt.Issuer, log logger.Logger) *Handler {
	return &Handler{svc: svc, issuer: issuer, log: log}
}

// Register mounts workspace routes on g with RequireAuth middleware.
// Paths: /workspaces, /workspaces/:id, /workspaces/:id/members, /workspaces/:id/invitations, /invitations/accept.
func (h *Handler) Register(g *gin.RouterGroup) {
	workspaces := g.Group("/workspaces")
	workspaces.Use(middleware.RequireAuth(h.issuer))
	workspaces.GET("", h.list)
	workspaces.POST("", h.create)
	// More specific routes first so /:id does not capture "id/members" etc.
	workspaces.GET("/:id/members", h.listMembers)
	workspaces.POST("/:id/invitations", h.invite)
	workspaces.DELETE("/:id/members/:userId", h.removeMember)
	workspaces.PUT("/:id/members/:userId", h.updateMemberRole)
	workspaces.GET("/:id", h.get)
	workspaces.PUT("/:id", h.update)
	workspaces.DELETE("/:id", h.delete)

	invitations := g.Group("/invitations")
	invitations.Use(middleware.RequireAuth(h.issuer))
	invitations.POST("/accept", h.acceptInvitation)
}

func (h *Handler) list(c *gin.Context) {
	userID := middleware.GetUserID(c)
	list, err := h.svc.ListWorkspaces(c.Request.Context(), userID)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, list)
}

func (h *Handler) create(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req CreateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	resp, err := h.svc.CreateWorkspace(c.Request.Context(), userID, req.Name, req.Description, req.Color, req.Tags)
	if err != nil {
		if h.log != nil {
			h.log.Error().Err(err).Str("request_id", c.GetHeader("X-Request-ID")).Msg("create workspace failed")
		}
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteCreated(c, resp)
}

func (h *Handler) get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid workspace ID."})
		return
	}
	userID := middleware.GetUserID(c)
	resp, err := h.svc.GetWorkspace(c.Request.Context(), id, userID)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, resp)
}

func (h *Handler) update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid workspace ID."})
		return
	}
	userID := middleware.GetUserID(c)
	var req UpdateWorkspaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	resp, err := h.svc.UpdateWorkspace(c.Request.Context(), id, userID, req.Name, req.Description, req.Color, req.Tags)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, resp)
}

func (h *Handler) delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid workspace ID."})
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.DeleteWorkspace(c.Request.Context(), id, userID); err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteNoContent(c)
}

func (h *Handler) listMembers(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid workspace ID."})
		return
	}
	userID := middleware.GetUserID(c)
	list, err := h.svc.ListMembers(c.Request.Context(), workspaceID, userID)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, list)
}

func (h *Handler) invite(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid workspace ID."})
		return
	}
	userID := middleware.GetUserID(c)
	var req InviteMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	role := model.RoleMember
	if req.Role != "" {
		role = model.Role(req.Role)
	}
	inviterEmail := middleware.GetUserEmail(c)
	resp, err := h.svc.InviteMember(c.Request.Context(), workspaceID, userID, req.Email, role, inviterEmail)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteCreated(c, resp)
}

func (h *Handler) removeMember(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid workspace ID."})
		return
	}
	targetUserID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid user ID."})
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.RemoveMember(c.Request.Context(), workspaceID, userID, targetUserID); err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteNoContent(c)
}

func (h *Handler) updateMemberRole(c *gin.Context) {
	workspaceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid workspace ID."})
		return
	}
	targetUserID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid user ID."})
		return
	}
	userID := middleware.GetUserID(c)
	var req UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	resp, err := h.svc.UpdateMemberRole(c.Request.Context(), workspaceID, userID, targetUserID, model.Role(req.Role))
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, resp)
}

func (h *Handler) acceptInvitation(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req AcceptInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	token, err := uuid.Parse(req.Token)
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid invitation token."})
		return
	}
	userEmail := middleware.GetUserEmail(c)
	resp, err := h.svc.AcceptInvitation(c.Request.Context(), userID, userEmail, token)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, resp)
}

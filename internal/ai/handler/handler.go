package handler

import (
	"errors"
	"net/http"

	"github.com/devenock/d_weaver/internal/ai/service"
	"github.com/devenock/d_weaver/internal/auth/jwt"
	"github.com/devenock/d_weaver/internal/auth/middleware"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/gin-gonic/gin"
)

// Handler handles HTTP for AI generate-diagram.
type Handler struct {
	svc *service.Service
}

// New returns an AI HTTP handler.
func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// Register mounts AI routes on g. Path: POST /ai/generate-diagram (RequireAuth).
func (h *Handler) Register(g *gin.RouterGroup, issuer *jwt.Issuer) {
	ai := g.Group("/ai")
	ai.Use(middleware.RequireAuth(issuer))
	ai.POST("/generate-diagram", h.generateDiagram)
}

// GenerateDiagramResponse is the success payload (data envelope).
type GenerateDiagramResponse struct {
	Diagram string `json:"diagram"`
}

func (h *Handler) generateDiagram(c *gin.Context) {
	var req GenerateDiagramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{
			Code:    common.CodeInvalidInput,
			Message: "Invalid or missing input. Description is required.",
			Details: map[string]interface{}{"error": err.Error()},
		})
		return
	}
	diagramType := req.DiagramType
	diagram, err := h.svc.GenerateDiagram(c.Request.Context(), req.Description, diagramType)
	if err != nil {
		var de *common.DomainError
		if errors.As(err, &de) {
			switch de.Code {
			case "rate_limit_exceeded":
				common.WriteError(c, http.StatusTooManyRequests, common.ErrorBody{Code: de.Code, Message: de.Message})
				return
			case "payment_required":
				common.WriteError(c, http.StatusPaymentRequired, common.ErrorBody{Code: de.Code, Message: de.Message})
				return
			}
		}
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, GenerateDiagramResponse{Diagram: diagram})
}

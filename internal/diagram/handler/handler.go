package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/devenock/d_weaver/config"
	"github.com/devenock/d_weaver/internal/auth/jwt"
	"github.com/devenock/d_weaver/internal/auth/middleware"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/devenock/d_weaver/internal/diagram/service"
	"github.com/devenock/d_weaver/pkg/logger"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Allowed image content types for upload (PDF: type checks, 10MB).
var allowedImageTypes = map[string]bool{
	"image/png":  true,
	"image/jpeg": true,
	"image/gif":  true,
	"image/webp": true,
}

// Handler handles HTTP for diagrams and comments.
type Handler struct {
	svc    *service.Service
	issuer *jwt.Issuer
	upload config.UploadConfig
	log    logger.Logger
}

// New returns a diagram HTTP handler.
func New(svc *service.Service, issuer *jwt.Issuer, upload config.UploadConfig, log logger.Logger) *Handler {
	return &Handler{svc: svc, issuer: issuer, upload: upload, log: log}
}

// Register mounts diagram routes on g with RequireAuth where needed.
// Paths: /diagrams, /diagrams/:id, /diagrams/:id/image, /diagrams/:id/comments, /diagrams/:id/comments/:commentId.
func (h *Handler) Register(g *gin.RouterGroup) {
	diagrams := g.Group("/diagrams")
	diagrams.Use(middleware.RequireAuth(h.issuer))
	diagrams.GET("", h.list)
	diagrams.POST("", h.create)
	diagrams.GET("/public", h.listPublic)
	diagrams.GET("/:id", h.get)
	diagrams.PUT("/:id", h.update)
	diagrams.DELETE("/:id", h.delete)
	diagrams.POST("/:id/image", h.uploadImage)
	diagrams.GET("/:id/comments", h.listComments)
	diagrams.POST("/:id/comments", h.addComment)
	diagrams.PUT("/:id/comments/:commentId", h.updateComment)
	diagrams.DELETE("/:id/comments/:commentId", h.deleteComment)
}

func (h *Handler) list(c *gin.Context) {
	userID := middleware.GetUserID(c)
	list, err := h.svc.ListDiagrams(c.Request.Context(), userID)
	if err != nil {
		if h.log != nil {
			h.log.Error().Err(err).Str("request_id", c.GetHeader("X-Request-ID")).Msg("list diagrams failed")
		}
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, list)
}

func (h *Handler) listPublic(c *gin.Context) {
	list, err := h.svc.ListPublic(c.Request.Context(), 50)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, list)
}

func (h *Handler) create(c *gin.Context) {
	userID := middleware.GetUserID(c)
	var req CreateDiagramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	var workspaceID *uuid.UUID
	if req.WorkspaceID != nil && *req.WorkspaceID != "" {
		id, err := uuid.Parse(*req.WorkspaceID)
		if err != nil {
			common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid workspace ID."})
			return
		}
		workspaceID = &id
	}
	resp, err := h.svc.CreateDiagram(c.Request.Context(), userID, workspaceID, req.Title, req.Content, req.DiagramType, req.IsPublic)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteCreated(c, resp)
}

func (h *Handler) get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid diagram ID."})
		return
	}
	userID := middleware.GetUserID(c)
	resp, err := h.svc.GetDiagram(c.Request.Context(), id, userID)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, resp)
}

func (h *Handler) update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid diagram ID."})
		return
	}
	userID := middleware.GetUserID(c)
	var req UpdateDiagramRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	title, content, diagramType := req.Title, req.Content, req.DiagramType
	isPublic := false
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}
	// If partial update, we need current values for omitted fields. Service expects full update; repository too. So we need to get current diagram and merge.
	d, err := h.svc.GetDiagram(c.Request.Context(), id, userID)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	if title == "" {
		title = d.Title
	}
	if content == "" {
		content = d.Content
	}
	if diagramType == "" {
		diagramType = d.DiagramType
	}
	resp, err := h.svc.UpdateDiagram(c.Request.Context(), id, userID, title, content, diagramType, isPublic)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, resp)
}

func (h *Handler) delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid diagram ID."})
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.DeleteDiagram(c.Request.Context(), id, userID); err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteNoContent(c)
}

func (h *Handler) uploadImage(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid diagram ID."})
		return
	}
	userID := middleware.GetUserID(c)
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Missing or invalid file. Use multipart form field 'file'."})
		return
	}
	defer file.Close()
	if header.Size > int64(h.upload.MaxBytes) {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: fmt.Sprintf("File size exceeds maximum of %d bytes.", h.upload.MaxBytes)})
		return
	}
	contentType := header.Header.Get("Content-Type")
	if !allowedImageTypes[contentType] {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid file type. Allowed: image/png, image/jpeg, image/gif, image/webp."})
		return
	}
	ext := ".png"
	switch {
	case strings.Contains(contentType, "jpeg"), strings.Contains(contentType, "jpg"):
		ext = ".jpg"
	case strings.Contains(contentType, "gif"):
		ext = ".gif"
	case strings.Contains(contentType, "webp"):
		ext = ".webp"
	}
	dir := filepath.Join(h.upload.Dir, "diagrams", id.String())
	if err := mkdirAll(dir); err != nil {
		common.WriteError(c, http.StatusInternalServerError, common.ErrorBody{Code: common.CodeInternalError, Message: "Failed to save image."})
		return
	}
	filename := uuid.New().String() + ext
	fullPath := filepath.Join(dir, filename)
	if err := saveFile(fullPath, file); err != nil {
		common.WriteError(c, http.StatusInternalServerError, common.ErrorBody{Code: common.CodeInternalError, Message: "Failed to save image."})
		return
	}
	// URL path that the server will serve (e.g. /uploads/diagrams/<id>/<filename>)
	imageURL := "/uploads/diagrams/" + id.String() + "/" + filename
	resp, err := h.svc.UpdateDiagramImage(c.Request.Context(), id, userID, imageURL)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, resp)
}

func mkdirAll(path string) error {
	return os.MkdirAll(path, 0755)
}

func saveFile(path string, r io.Reader) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	return err
}

func (h *Handler) listComments(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid diagram ID."})
		return
	}
	userID := middleware.GetUserID(c)
	list, err := h.svc.ListComments(c.Request.Context(), id, userID)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, list)
}

func (h *Handler) addComment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid diagram ID."})
		return
	}
	userID := middleware.GetUserID(c)
	var req AddCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	resp, err := h.svc.AddComment(c.Request.Context(), id, userID, req.CommentText)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteCreated(c, resp)
}

func (h *Handler) updateComment(c *gin.Context) {
	commentID, err := uuid.Parse(c.Param("commentId"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid comment ID."})
		return
	}
	userID := middleware.GetUserID(c)
	var req UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid or missing input.", Details: map[string]interface{}{"error": err.Error()}})
		return
	}
	resp, err := h.svc.UpdateComment(c.Request.Context(), commentID, userID, req.CommentText)
	if err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteOK(c, resp)
}

func (h *Handler) deleteComment(c *gin.Context) {
	commentID, err := uuid.Parse(c.Param("commentId"))
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid comment ID."})
		return
	}
	userID := middleware.GetUserID(c)
	if err := h.svc.DeleteComment(c.Request.Context(), commentID, userID); err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	common.WriteNoContent(c)
}

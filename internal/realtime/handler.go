package realtime

import (
	"context"
	"net/http"
	"strings"

	"github.com/devenock/d_weaver/internal/auth/jwt"
	"github.com/devenock/d_weaver/internal/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // allow same-origin and configured origins; tighten in prod via CORS
	},
}

// DiagramAccessChecker returns nil if the user can access the diagram (for WebSocket join).
type DiagramAccessChecker interface {
	CheckDiagramAccess(ctx context.Context, diagramID, userID uuid.UUID) error
}

// Handler handles WebSocket upgrade for /ws/collaboration/:diagramId.
type Handler struct {
	hub     *Hub
	issuer  *jwt.Issuer
	checker DiagramAccessChecker
}

// NewHandler returns a realtime WebSocket handler.
func NewHandler(hub *Hub, issuer *jwt.Issuer, checker DiagramAccessChecker) *Handler {
	return &Handler{hub: hub, issuer: issuer, checker: checker}
}

// ServeWS upgrades the connection and runs the client. Auth via query param: ?token=<access_token>.
func (h *Handler) ServeWS(c *gin.Context) {
	diagramIDStr := c.Param("diagramId")
	diagramID, err := uuid.Parse(diagramIDStr)
	if err != nil {
		common.WriteError(c, http.StatusBadRequest, common.ErrorBody{Code: common.CodeInvalidInput, Message: "Invalid diagram ID."})
		return
	}
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		auth := c.GetHeader("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			token = strings.TrimPrefix(auth, "Bearer ")
		}
	}
	if token == "" {
		if t, _ := c.Cookie("access_token"); t != "" {
			token = t
		}
	}
	if token == "" {
		common.WriteError(c, http.StatusUnauthorized, common.ErrorBody{Code: common.CodeUnauthorized, Message: "Missing token. Use query ?token=<access_token>, Authorization: Bearer <token>, or access_token cookie."})
		return
	}
	userID, email, err := h.issuer.ValidateAccessToken(token)
	if err != nil {
		common.WriteError(c, http.StatusUnauthorized, common.ErrorBody{Code: common.CodeUnauthorized, Message: "Invalid or expired token."})
		return
	}
	if err := h.checker.CheckDiagramAccess(c.Request.Context(), diagramID, userID); err != nil {
		common.WriteErrorFromDomain(c, err)
		return
	}
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	client := &Client{
		hub:      h.hub,
		conn:     conn,
		send:     make(chan []byte, sendBufferSize),
		diagramID: diagramID,
		userID:   userID,
		email:    email,
	}
	client.Run()
}

package web

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/devenock/d_weaver/internal/auth/jwt"
	authsvc "github.com/devenock/d_weaver/internal/auth/service"
	diagrammodel "github.com/devenock/d_weaver/internal/diagram/model"
	workspacemodel "github.com/devenock/d_weaver/internal/workspace/model"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	cookieName     = "access_token"
	cookiePath     = "/"
	cookieSameSite = http.SameSiteLaxMode
)

// AuthService is the minimal auth interface for web login/signup.
type AuthService interface {
	Login(ctx context.Context, email, password string) (*authsvc.LoginResult, error)
	Register(ctx context.Context, email, password string) (*authsvc.RegisterResult, error)
}

// WorkspaceLister lists workspaces for the current user (for dashboard partials).
type WorkspaceLister interface {
	ListWorkspaces(ctx context.Context, userID uuid.UUID) ([]workspacemodel.WorkspaceResponse, error)
}

// DiagramLister lists diagrams for the current user (for dashboard partials).
type DiagramLister interface {
	ListDiagrams(ctx context.Context, userID uuid.UUID) ([]diagrammodel.DiagramResponse, error)
}

// Handler serves the htmx static frontend and cookie-based auth.
type Handler struct {
	authSvc       AuthService
	issuer        *jwt.Issuer
	staticDir     string
	accessMinutes int
	wsLister      WorkspaceLister
	diagLister    DiagramLister
}

// New returns a web handler that serves static pages and form login/signup/logout.
// wsLister and diagLister are optional; when set, dashboard partials (workspaces/diagrams) are enabled.
func New(authSvc AuthService, issuer *jwt.Issuer, staticDir string, accessMinutes int, wsLister WorkspaceLister, diagLister DiagramLister) *Handler {
	if accessMinutes <= 0 {
		accessMinutes = 15
	}
	return &Handler{
		authSvc:       authSvc,
		issuer:        issuer,
		staticDir:     strings.TrimSuffix(staticDir, "/"),
		accessMinutes: accessMinutes,
		wsLister:      wsLister,
		diagLister:    diagLister,
	}
}

// Register mounts web routes on r. Serves static assets under /static and HTML pages at /, /login, /signup, etc.
// Protected routes (e.g. /dashboard) require a valid access_token cookie; otherwise redirect to /login.
func (h *Handler) Register(r *gin.Engine) {
	if h.staticDir == "" {
		return
	}
	// Static assets: /static/* -> staticDir/*
	r.Static("/static", h.staticDir)
	// Ensure API and health are not overridden
	grp := r.Group("")
	grp.GET("/", h.servePage("index.html"))
	grp.GET("/login", h.servePage("login.html"))
	grp.GET("/signup", h.servePage("signup.html"))
	grp.GET("/join-workspace", h.servePage("join-workspace.html"))
	grp.GET("/editor", h.requireAuthCookie(h.servePage("editor.html")))
	grp.GET("/whiteboard", h.requireAuthCookie(h.servePage("whiteboard.html")))
	grp.GET("/dashboard", h.requireAuthCookie(h.serveDashboard))
	if h.wsLister != nil && h.diagLister != nil {
		grp.GET("/dashboard/partials/workspaces", h.requireAuthCookie(h.serveWorkspacesPartial))
		grp.GET("/dashboard/partials/sidebar", h.requireAuthCookie(h.serveDashboardSidebarPartial))
		grp.GET("/dashboard/partials/diagrams", h.requireAuthCookie(h.serveDiagramsPartial))
		grp.GET("/gallery/partials/diagrams", h.requireAuthCookie(h.serveGalleryDiagramsPartial))
	}
	grp.GET("/gallery", h.requireAuthCookie(h.servePage("gallery.html")))
	grp.GET("/workspaces/new", h.requireAuthCookie(h.servePage("workspaces-new.html")))
	grp.GET("/forgot-password", h.servePage("forgot-password.html"))
	grp.GET("/reset-password", h.servePage("reset-password.html"))
	grp.POST("/login", h.handleLogin)
	grp.POST("/signup", h.handleSignup)
	grp.POST("/logout", h.handleLogout)
	grp.GET("/auth", h.redirectToLogin)
	r.NoRoute(h.serve404)
}

// serve404 serves 404.html for unhandled GET; for non-GET returns 404.
func (h *Handler) serve404(c *gin.Context) {
	if c.Request.Method != http.MethodGet {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	body, err := os.ReadFile(filepath.Join(h.staticDir, "404.html"))
	if err != nil {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	c.Data(http.StatusNotFound, "text/html; charset=utf-8", body)
}

// servePage reads a file from staticDir and serves it as HTML.
func (h *Handler) servePage(name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		fpath := filepath.Join(h.staticDir, name)
		body, err := os.ReadFile(fpath)
		if err != nil {
			if os.IsNotExist(err) {
				// try 404
				body404, err404 := os.ReadFile(filepath.Join(h.staticDir, "404.html"))
				if err404 == nil {
					c.Data(http.StatusNotFound, "text/html; charset=utf-8", body404)
					return
				}
				c.AbortWithStatus(http.StatusNotFound)
				return
			}
			c.AbortWithStatus(http.StatusInternalServerError)
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", body)
	}
}

// serveDashboard renders dashboard.html with UserEmail from context (set by requireAuthCookie).
func (h *Handler) serveDashboard(c *gin.Context) {
	name := "dashboard.html"
	fpath := filepath.Join(h.staticDir, name)
	body, err := os.ReadFile(fpath)
	if err != nil {
		if os.IsNotExist(err) {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	tpl, err := template.New(name).Parse(string(body))
	if err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	email, _ := c.Get("user_email")
	data := map[string]string{"UserEmail": ""}
	if e, ok := email.(string); ok && e != "" {
		data["UserEmail"] = e
	}
	var b strings.Builder
	if err := tpl.Execute(&b, data); err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
}

// requireAuthCookie validates the access_token cookie; if missing or invalid, redirects to /login?redirect=<path>.
func (h *Handler) requireAuthCookie(next gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(cookieName)
		if err != nil || token == "" {
			redirectToLogin(c)
			return
		}
		userID, email, err := h.issuer.ValidateAccessToken(token)
		if err != nil {
			redirectToLogin(c)
			return
		}
		c.Set("user_id", userID)
		c.Set("user_email", email)
		next(c)
	}
}

func redirectToLogin(c *gin.Context) {
	path := c.Request.URL.Path
	if path == "" {
		path = "/dashboard"
	}
	c.Redirect(http.StatusFound, "/login?redirect="+path)
	c.Abort()
}

func (h *Handler) redirectToLogin(c *gin.Context) {
	redirect := c.Query("redirect")
	if redirect == "" || !strings.HasPrefix(redirect, "/") {
		redirect = "/dashboard"
	}
	c.Redirect(http.StatusFound, "/login?redirect="+redirect)
}

func (h *Handler) handleLogin(c *gin.Context) {
	redirect := strings.TrimSpace(c.PostForm("redirect"))
	if redirect == "" || !strings.HasPrefix(redirect, "/") {
		redirect = "/dashboard"
	}
	email := strings.TrimSpace(c.PostForm("email"))
	password := c.PostForm("password")
	if email == "" || password == "" {
		c.Redirect(http.StatusFound, "/login?error=invalid_input&redirect="+redirect)
		return
	}
	res, err := h.authSvc.Login(c.Request.Context(), email, password)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=invalid_credentials&redirect="+redirect)
		return
	}
	setAccessCookie(c, res.AccessToken, h.accessMinutes)
	c.Redirect(http.StatusFound, redirect)
}

func (h *Handler) handleSignup(c *gin.Context) {
	redirect := strings.TrimSpace(c.PostForm("redirect"))
	if redirect == "" || !strings.HasPrefix(redirect, "/") {
		redirect = "/dashboard"
	}
	email := strings.TrimSpace(c.PostForm("email"))
	password := c.PostForm("password")
	if email == "" || password == "" {
		c.Redirect(http.StatusFound, "/signup?error=invalid_input&redirect="+redirect)
		return
	}
	res, err := h.authSvc.Register(c.Request.Context(), email, password)
	if err != nil {
		c.Redirect(http.StatusFound, "/signup?error=signup_failed&redirect="+redirect)
		return
	}
	setAccessCookie(c, res.AccessToken, h.accessMinutes)
	c.Redirect(http.StatusFound, redirect)
}

func (h *Handler) handleLogout(c *gin.Context) {
	clearAccessCookie(c)
	c.Redirect(http.StatusFound, "/")
}

func setAccessCookie(c *gin.Context, token string, maxAgeMinutes int) {
	maxAge := maxAgeMinutes * 60
	if maxAge <= 0 {
		maxAge = 900
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     cookiePath,
		MaxAge:   maxAge,
		HttpOnly: true,
		SameSite: cookieSameSite,
		Secure:   false, // set true when TLS in production
	})
}

func clearAccessCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     cookiePath,
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: cookieSameSite,
	})
}

// GetUserID returns the authenticated user's ID from context (after RequireAuthCookie).
func GetUserID(c *gin.Context) uuid.UUID {
	v, _ := c.Get("user_id")
	id, _ := v.(uuid.UUID)
	return id
}

func (h *Handler) getUserID(c *gin.Context) uuid.UUID {
	v, _ := c.Get("user_id")
	id, _ := v.(uuid.UUID)
	return id
}

// serveWorkspacesPartial returns HTML fragment of workspace list for dashboard sidebar.
func (h *Handler) serveWorkspacesPartial(c *gin.Context) {
	userID := h.getUserID(c)
	list, err := h.wsLister.ListWorkspaces(c.Request.Context(), userID)
	if err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	tpl := template.Must(template.New("workspaces").Parse(partialWorkspacesHTML))
	var b strings.Builder
	if err := tpl.Execute(&b, map[string]interface{}{"Workspaces": list}); err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
}

// serveDashboardSidebarPartial returns HTML for sidebar: Diagrams list, Whiteboards list, Recent list (matches React AppSidebar).
func (h *Handler) serveDashboardSidebarPartial(c *gin.Context) {
	userID := h.getUserID(c)
	list, err := h.diagLister.ListDiagrams(c.Request.Context(), userID)
	if err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	// Sort by updated_at desc (recent first)
	for i := 0; i < len(list); i++ {
		for j := i + 1; j < len(list); j++ {
			if list[j].UpdatedAt.After(list[i].UpdatedAt) {
				list[i], list[j] = list[j], list[i]
			}
		}
	}
	type sideItem struct {
		ID        string
		Title     string
		EditorURL string
	}
	var diagrams, whiteboards, recent []sideItem
	for i := range list {
		url := "/editor?id=" + list[i].ID.String()
		if list[i].DiagramType == "whiteboard" {
			url = "/whiteboard?id=" + list[i].ID.String()
		}
		item := sideItem{ID: list[i].ID.String(), Title: list[i].Title, EditorURL: url}
		if list[i].DiagramType == "whiteboard" {
			whiteboards = append(whiteboards, item)
		} else {
			diagrams = append(diagrams, item)
		}
	}
	for i := 0; i < len(list) && i < 5; i++ {
		url := "/editor?id=" + list[i].ID.String()
		if list[i].DiagramType == "whiteboard" {
			url = "/whiteboard?id=" + list[i].ID.String()
		}
		recent = append(recent, sideItem{ID: list[i].ID.String(), Title: list[i].Title, EditorURL: url})
	}
	if len(diagrams) > 10 {
		diagrams = diagrams[:10]
	}
	if len(whiteboards) > 10 {
		whiteboards = whiteboards[:10]
	}
	tpl := template.Must(template.New("sidebar").Parse(partialDashboardSidebarHTML))
	var b strings.Builder
	if err := tpl.Execute(&b, map[string]interface{}{
		"Diagrams":   diagrams,
		"Whiteboards": whiteboards,
		"Recent":     recent,
	}); err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
}

// serveDiagramsPartial returns HTML fragment of diagram cards for dashboard main. Supports ?q= for search.
func (h *Handler) serveDiagramsPartial(c *gin.Context) {
	userID := h.getUserID(c)
	list, err := h.diagLister.ListDiagrams(c.Request.Context(), userID)
	if err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	q := strings.TrimSpace(strings.ToLower(c.Query("q")))
	if q != "" {
		filtered := make([]diagrammodel.DiagramResponse, 0, len(list))
		for _, d := range list {
			if strings.Contains(strings.ToLower(d.Title), q) || strings.Contains(strings.ToLower(d.DiagramType), q) {
				filtered = append(filtered, d)
			}
		}
		list = filtered
	}
	// Sort by updated_at desc (recent first)
	type diagramWithTime struct {
		diagrammodel.DiagramResponse
		UpdatedAtFormatted string
		EditorURL          string
	}
	items := make([]diagramWithTime, len(list))
	for i := range list {
		items[i] = diagramWithTime{
			DiagramResponse:    list[i],
			UpdatedAtFormatted: list[i].UpdatedAt.Format("Jan 2, 2006"),
			EditorURL:          "/editor?id=" + list[i].ID.String(),
		}
		if list[i].DiagramType == "whiteboard" {
			items[i].EditorURL = "/whiteboard?id=" + list[i].ID.String()
		}
	}
	tpl := template.Must(template.New("diagrams").Funcs(template.FuncMap{
		"safeURL": func(s interface{}) string {
			if s == nil {
				return ""
			}
			switch v := s.(type) {
			case *string:
				if v == nil {
					return ""
				}
				return *v
			case string:
				return v
			default:
				return ""
			}
		},
	}).Parse(partialDiagramsHTML))
	var b strings.Builder
	if err := tpl.Execute(&b, map[string]interface{}{"Diagrams": items}); err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
}

// serveGalleryDiagramsPartial returns HTML fragment of diagram cards for gallery (with View, Edit, Delete, Share, Download).
func (h *Handler) serveGalleryDiagramsPartial(c *gin.Context) {
	userID := h.getUserID(c)
	list, err := h.diagLister.ListDiagrams(c.Request.Context(), userID)
	if err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	scope := strings.TrimSpace(c.Query("scope"))
	if scope == "" {
		scope = "all"
	}
	q := strings.TrimSpace(strings.ToLower(c.Query("q")))
	filtered := make([]diagrammodel.DiagramResponse, 0, len(list))
	for _, d := range list {
		if scope == "personal" && d.WorkspaceID != nil {
			continue
		}
		if q != "" {
			title := strings.ToLower(d.Title)
			dt := strings.ToLower(d.DiagramType)
			if !strings.Contains(title, q) && !strings.Contains(dt, q) {
				continue
			}
		}
		filtered = append(filtered, d)
	}
	type diagramWithMeta struct {
		diagrammodel.DiagramResponse
		UpdatedAtFormatted string
		EditorURL          string
		ImageURLSafe       string
	}
	items := make([]diagramWithMeta, len(filtered))
	for i := range filtered {
		img := ""
		if filtered[i].ImageURL != nil && *filtered[i].ImageURL != "" {
			img = *filtered[i].ImageURL
		}
		items[i] = diagramWithMeta{
			DiagramResponse:    filtered[i],
			UpdatedAtFormatted: filtered[i].UpdatedAt.Format("Jan 2, 2006"),
			EditorURL:           "/editor?id=" + filtered[i].ID.String(),
			ImageURLSafe:        img,
		}
		if filtered[i].DiagramType == "whiteboard" {
			items[i].EditorURL = "/whiteboard?id=" + filtered[i].ID.String()
		}
	}
	tpl := template.Must(template.New("gallery").Parse(partialGalleryDiagramsHTML))
	var b strings.Builder
	if err := tpl.Execute(&b, map[string]interface{}{"Diagrams": items}); err != nil {
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
}

const partialGalleryDiagramsHTML = `
<div id="gallery-diagrams" class="grid gap-4" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;">
  {{range .Diagrams}}
  <div class="gallery-card rounded-xl border border-border bg-card p-4 shadow-sm" data-diagram-id="{{.ID}}" style="border-radius:0.75rem;">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-semibold text-base truncate flex-1" style="min-width:0;"><a href="{{.EditorURL}}" class="link-primary" style="text-decoration:none;">{{.Title}}</a></h3>
    </div>
    <p class="text-xs text-muted-foreground mt-1">{{.DiagramType}} • {{.UpdatedAtFormatted}}</p>
    <div class="mt-3 rounded-md bg-muted/50 h-24 flex items-center justify-center overflow-hidden" style="min-height:6rem;">
      {{if .ImageURLSafe}}
      <img src="{{.ImageURLSafe}}" alt="{{.Title}}" class="max-w-full max-h-full object-contain" />
      {{else}}
      <span class="text-xs text-muted-foreground">No preview</span>
      {{end}}
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <a href="{{.EditorURL}}" class="btn btn-outline btn-sm">View</a>
      <button type="button" class="gallery-share btn btn-outline btn-sm" data-id="{{.ID}}" data-title="{{.Title}}">Share</button>
      {{if .ImageURLSafe}}
      <a href="{{.ImageURLSafe}}" download="{{.Title}}.png" class="btn btn-outline btn-sm">Download</a>
      {{end}}
      <button type="button" class="gallery-delete btn btn-outline btn-sm text-destructive" data-id="{{.ID}}">Delete</button>
    </div>
  </div>
  {{else}}
  <div class="col-span-full rounded-xl border border-dashed border-border bg-card p-8 text-center" style="grid-column:1/-1;">
    <p class="text-muted-foreground mb-4">No diagrams match.</p>
    <a href="/editor" class="btn btn-primary">New Diagram</a>
  </div>
  {{end}}
</div>
`

const partialWorkspacesHTML = `
<div id="dashboard-workspaces" class="space-y-1">
  <p class="text-xs font-medium text-muted-foreground mb-2">Workspaces</p>
  {{range .Workspaces}}
  <a href="/dashboard?workspace={{.ID}}" class="block rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted/50" style="text-decoration:none;color:inherit;">
    <span class="font-medium">{{.Name}}</span>
  </a>
  {{end}}
  <a href="/workspaces/new" class="block rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50" style="text-decoration:none;">+ Create workspace</a>
</div>
`

const partialDashboardSidebarHTML = `
<div id="dashboard-sidebar-nav" class="space-y-4">
  <div>
    <div class="flex items-center justify-between mb-1">
      <p class="text-xs font-medium text-muted-foreground">Diagrams</p>
      <a href="/editor" class="text-xs text-primary hover:underline">+</a>
    </div>
    <div class="space-y-0.5">
      {{range .Diagrams}}
      <a href="{{.EditorURL}}" class="block rounded-md px-2 py-1.5 text-sm truncate hover:bg-muted/50" style="text-decoration:none;color:inherit;">{{.Title}}</a>
      {{else}}
      <p class="px-2 py-1.5 text-xs text-muted-foreground">No diagrams yet</p>
      {{end}}
    </div>
  </div>
  <div>
    <div class="flex items-center justify-between mb-1">
      <p class="text-xs font-medium text-muted-foreground">Whiteboards</p>
      <a href="/whiteboard" class="text-xs text-primary hover:underline">+</a>
    </div>
    <div class="space-y-0.5">
      {{range .Whiteboards}}
      <a href="{{.EditorURL}}" class="block rounded-md px-2 py-1.5 text-sm truncate hover:bg-muted/50" style="text-decoration:none;color:inherit;">{{.Title}}</a>
      {{else}}
      <p class="px-2 py-1.5 text-xs text-muted-foreground">No whiteboards yet</p>
      {{end}}
    </div>
  </div>
  <div>
    <p class="text-xs font-medium text-muted-foreground mb-1">Recent</p>
    <div class="space-y-0.5">
      {{range .Recent}}
      <a href="{{.EditorURL}}" class="block rounded-md px-2 py-1.5 text-sm truncate hover:bg-muted/50" style="text-decoration:none;color:inherit;">{{.Title}}</a>
      {{else}}
      <p class="px-2 py-1.5 text-xs text-muted-foreground">No recent items</p>
      {{end}}
    </div>
  </div>
</div>
`

const partialDiagramsHTML = `
<div id="dashboard-diagrams" class="grid gap-4" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;">
  {{range .Diagrams}}
  <div class="dashboard-card rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow group" data-diagram-id="{{.ID}}">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-semibold text-base truncate flex-1" style="min-width:0;"><a href="{{.EditorURL}}" class="hover:underline" style="text-decoration:none;color:inherit;">{{.Title}}</a></h3>
      <div class="dashboard-card-actions flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href="{{.EditorURL}}" class="btn btn-ghost btn-sm" title="View">View</a>
        <button type="button" class="dashboard-share btn btn-ghost btn-sm" data-id="{{.ID}}" title="Share">Share</button>
        {{if .ImageURL}}
        <a href="{{safeURL .ImageURL}}" download="{{.Title}}.png" class="btn btn-ghost btn-sm" title="Download">Download</a>
        {{end}}
        <button type="button" class="dashboard-delete btn btn-ghost btn-sm text-destructive" data-id="{{.ID}}" title="Delete">Delete</button>
      </div>
    </div>
    <p class="text-xs text-muted-foreground mt-1">{{.DiagramType}} • {{.UpdatedAtFormatted}}</p>
    <div class="mt-3 rounded-md bg-muted/50 h-24 flex items-center justify-center overflow-hidden" style="min-height:6rem;">
      {{if .ImageURL}}
      <img src="{{safeURL .ImageURL}}" alt="{{.Title}}" class="max-w-full max-h-full object-contain" />
      {{else}}
      <span class="text-xs text-muted-foreground">No preview</span>
      {{end}}
    </div>
  </div>
  {{else}}
  <div class="col-span-full rounded-xl border border-dashed border-border bg-card p-8 text-center" style="grid-column:1/-1;">
    <p class="text-muted-foreground mb-4">No diagrams yet. Create your first one!</p>
    <a href="/editor" class="btn btn-primary">New Diagram</a>
  </div>
  {{end}}
</div>
`

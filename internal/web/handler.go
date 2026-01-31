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

// Handler serves the htmx static frontend and cookie-based auth.
type Handler struct {
	authSvc       AuthService
	issuer        *jwt.Issuer
	staticDir     string
	accessMinutes int
}

// New returns a web handler that serves static pages and form login/signup/logout.
func New(authSvc AuthService, issuer *jwt.Issuer, staticDir string, accessMinutes int) *Handler {
	if accessMinutes <= 0 {
		accessMinutes = 15
	}
	return &Handler{
		authSvc:       authSvc,
		issuer:        issuer,
		staticDir:     strings.TrimSuffix(staticDir, "/"),
		accessMinutes: accessMinutes,
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
	grp.GET("/gallery", h.servePage("gallery.html"))
	grp.GET("/join-workspace", h.servePage("join-workspace.html"))
	grp.GET("/editor", h.servePage("editor.html"))
	grp.GET("/whiteboard", h.servePage("whiteboard.html"))
	grp.GET("/dashboard", h.requireAuthCookie(h.serveDashboard))
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

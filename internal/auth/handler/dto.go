package handler

// Request DTOs for auth endpoints (validate with go-playground/validator).

// RegisterRequest is the body for POST /api/v1/auth/register.
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

// LoginRequest is the body for POST /api/v1/auth/login.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// LogoutRequest is the body for POST /api/v1/auth/logout.
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshRequest is the body for POST /api/v1/auth/refresh.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// ForgotPasswordRequest is the body for POST /api/v1/auth/forgot-password.
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest is the body for POST /api/v1/auth/reset-password.
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8,max=72"`
}

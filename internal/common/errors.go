package common

import (
	"errors"
	"fmt"
)

// Sentinel and domain errors for consistent mapping to HTTP and API codes.
var (
	ErrNotFound      = errors.New("not found")
	ErrUnauthorized  = errors.New("unauthorized")
	ErrForbidden     = errors.New("forbidden")
	ErrConflict      = errors.New("conflict")
	ErrBadRequest    = errors.New("bad request")
	ErrValidation    = errors.New("validation failed")
	ErrInternal      = errors.New("internal error")
)

// DomainError carries a stable code and optional wrapped cause for HTTP mapping.
type DomainError struct {
	Code    string
	Message string
	Cause   error
}

func (e *DomainError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Cause)
	}
	return e.Message
}

func (e *DomainError) Unwrap() error { return e.Cause }

// NewDomainError builds a DomainError with a stable code and user-facing message.
func NewDomainError(code, message string, cause error) *DomainError {
	return &DomainError{Code: code, Message: message, Cause: cause}
}

// API error codes used in JSON responses (strict, meaningful).
const (
	CodeInvalidInput   = "invalid_input"
	CodeUnauthorized   = "unauthorized"
	CodeForbidden      = "forbidden"
	CodeNotFound       = "not_found"
	CodeConflict       = "conflict"
	CodeInternalError  = "internal_error"
)

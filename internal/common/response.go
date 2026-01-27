package common

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorBody is the standard error JSON shape.
type ErrorBody struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// SuccessBody is the standard success envelope for data responses.
type SuccessBody struct {
	Data interface{} `json:"data"`
}

// WriteOK writes a 200 JSON response with a "data" envelope.
func WriteOK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, SuccessBody{Data: data})
}

// WriteCreated writes a 201 JSON response with a "data" envelope.
func WriteCreated(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, SuccessBody{Data: data})
}

// WriteNoContent sends 204 No Content.
func WriteNoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// WriteError writes a consistent error response from a body and status.
func WriteError(c *gin.Context, status int, body ErrorBody) {
	c.JSON(status, body)
}

// WriteErrorFromDomain maps DomainError to HTTP status and ErrorBody, then writes it.
func WriteErrorFromDomain(c *gin.Context, err error) {
	status, body := domainToHTTP(err)
	WriteError(c, status, body)
}

func domainToHTTP(err error) (int, ErrorBody) {
	body := ErrorBody{Code: CodeInternalError, Message: "An unexpected error occurred."}
	status := http.StatusInternalServerError

	var dom *DomainError
	if errors.As(err, &dom) {
		body.Code = dom.Code
		body.Message = dom.Message
		switch dom.Code {
		case CodeInvalidInput:
			status = http.StatusBadRequest
		case CodeNotFound:
			status = http.StatusNotFound
		case CodeUnauthorized:
			status = http.StatusUnauthorized
		case CodeForbidden:
			status = http.StatusForbidden
		case CodeConflict:
			status = http.StatusConflict
		default:
			status = http.StatusInternalServerError
		}
		return status, body
	}

	switch {
	case errors.Is(err, ErrNotFound):
		status = http.StatusNotFound
		body.Code = CodeNotFound
		body.Message = "The requested resource was not found."
	case errors.Is(err, ErrUnauthorized):
		status = http.StatusUnauthorized
		body.Code = CodeUnauthorized
		body.Message = "Authentication required."
	case errors.Is(err, ErrForbidden):
		status = http.StatusForbidden
		body.Code = CodeForbidden
		body.Message = "You do not have permission for this action."
	case errors.Is(err, ErrConflict):
		status = http.StatusConflict
		body.Code = CodeConflict
		body.Message = "The request conflicts with current state."
	case errors.Is(err, ErrBadRequest), errors.Is(err, ErrValidation):
		status = http.StatusBadRequest
		body.Code = CodeInvalidInput
		body.Message = "Invalid or missing input."
	default:
		body.Message = "An unexpected error occurred."
	}
	return status, body
}

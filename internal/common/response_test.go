package common

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestWriteErrorFromDomain_DomainError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	err := NewDomainError(CodeNotFound, "Diagram not found.", nil)
	WriteErrorFromDomain(c, err)
	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", w.Code, http.StatusNotFound)
	}
	var body ErrorBody
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Code != CodeNotFound || body.Message != "Diagram not found." {
		t.Errorf("body = %+v", body)
	}
}

func TestWriteErrorFromDomain_Sentinel(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	WriteErrorFromDomain(c, ErrUnauthorized)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
	var body ErrorBody
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Code != CodeUnauthorized {
		t.Errorf("code = %s", body.Code)
	}
}

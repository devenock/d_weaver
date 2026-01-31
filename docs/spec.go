package docs

import (
	_ "embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed auth.yaml
var AuthSpecYAML []byte

// ServeAuth writes the auth OpenAPI 3.0 spec (YAML) with content-type application/yaml.
func ServeAuth(c *gin.Context) {
	c.Data(http.StatusOK, "application/yaml", AuthSpecYAML)
}

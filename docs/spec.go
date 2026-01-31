package docs

import (
	_ "embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed auth.yaml
var AuthSpecYAML []byte

//go:embed workspace.yaml
var WorkspaceSpecYAML []byte

// ServeAuth writes the auth OpenAPI 3.0 spec (YAML) with content-type application/yaml.
func ServeAuth(c *gin.Context) {
	c.Data(http.StatusOK, "application/yaml", AuthSpecYAML)
}

// ServeWorkspace writes the workspace OpenAPI 3.0 spec (YAML) with content-type application/yaml.
func ServeWorkspace(c *gin.Context) {
	c.Data(http.StatusOK, "application/yaml", WorkspaceSpecYAML)
}

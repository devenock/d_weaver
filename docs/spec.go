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

//go:embed diagram.yaml
var DiagramSpecYAML []byte

//go:embed ai.yaml
var AISpecYAML []byte

// ServeAuth writes the auth OpenAPI 3.0 spec (YAML) with content-type application/yaml.
func ServeAuth(c *gin.Context) {
	c.Data(http.StatusOK, "application/yaml", AuthSpecYAML)
}

// ServeWorkspace writes the workspace OpenAPI 3.0 spec (YAML) with content-type application/yaml.
func ServeWorkspace(c *gin.Context) {
	c.Data(http.StatusOK, "application/yaml", WorkspaceSpecYAML)
}

// ServeDiagram writes the diagram OpenAPI 3.0 spec (YAML) with content-type application/yaml.
func ServeDiagram(c *gin.Context) {
	c.Data(http.StatusOK, "application/yaml", DiagramSpecYAML)
}

// ServeAI writes the AI OpenAPI 3.0 spec (YAML) with content-type application/yaml.
func ServeAI(c *gin.Context) {
	c.Data(http.StatusOK, "application/yaml", AISpecYAML)
}

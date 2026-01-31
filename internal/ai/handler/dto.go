package handler

// GenerateDiagramRequest is the body for POST /api/v1/ai/generate-diagram.
type GenerateDiagramRequest struct {
	Description string `json:"description" binding:"required,max=4096"`
	DiagramType string `json:"diagram_type" binding:"max=50"` // optional: flowchart, sequence, class, er, etc.
}

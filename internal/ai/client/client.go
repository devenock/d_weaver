package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Generator generates Mermaid diagram code from a text description (OpenAI-compatible chat completions).
type Generator interface {
	GenerateDiagram(ctx context.Context, description, diagramType string) (mermaid string, err error)
}

// HTTPGenerator calls an OpenAI-compatible chat completions endpoint.
type HTTPGenerator struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// NewHTTPGenerator returns a generator that POSTs to baseURL/chat/completions.
func NewHTTPGenerator(apiKey, baseURL, model string) *HTTPGenerator {
	baseURL = strings.TrimSuffix(baseURL, "/")
	return &HTTPGenerator{
		apiKey:  apiKey,
		baseURL: baseURL,
		model:   model,
		client:  &http.Client{Timeout: 60 * time.Second},
	}
}

// chatRequest matches the OpenAI chat completions request shape.
type chatRequest struct {
	Model       string    `json:"model"`
	Messages    []message `json:"messages"`
	Temperature float64   `json:"temperature"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// chatResponse matches the minimal response shape we need.
type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// GenerateDiagram calls the AI gateway and returns raw Mermaid code (no markdown fences).
func (g *HTTPGenerator) GenerateDiagram(ctx context.Context, description, diagramType string) (string, error) {
	if g.apiKey == "" {
		return "", fmt.Errorf("ai: API key not configured")
	}
	systemPrompt := `You are an expert diagram generator. Convert the user's description into Mermaid diagram syntax.

Important rules:
1. Return ONLY the Mermaid code, no explanations or markdown code blocks
2. Use the appropriate diagram type based on the context:
   - flowchart/graph: for processes, workflows, decision trees
   - sequenceDiagram: for interactions between entities
   - classDiagram: for class structures and relationships
   - erDiagram: for database schemas
   - stateDiagram-v2: for state machines
   - gantt: for project timelines
   - mindmap: for hierarchical ideas
   - C4Context/C4Container/C4Component: for architecture diagrams
   - gitGraph: for version control flows
3. Ensure proper syntax and node connections
4. Use clear, descriptive labels
5. Make the diagram comprehensive and well-structured`

	userContent := description
	if diagramType != "" && diagramType != "auto" {
		userContent = fmt.Sprintf("Create a %s diagram for: %s", diagramType, description)
	} else {
		userContent = "Create an appropriate diagram for: " + description
	}

	body := chatRequest{
		Model: g.model,
		Messages: []message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userContent},
		},
		Temperature: 0.7,
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("ai: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.baseURL+"/chat/completions", bytes.NewReader(raw))
	if err != nil {
		return "", fmt.Errorf("ai: create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+g.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("ai: request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == 429 {
			return "", fmt.Errorf("rate limit exceeded")
		}
		if resp.StatusCode == 402 {
			return "", fmt.Errorf("payment required")
		}
		return "", fmt.Errorf("ai: gateway returned %d: %s", resp.StatusCode, string(respBody))
	}

	var out chatResponse
	if err := json.Unmarshal(respBody, &out); err != nil {
		return "", fmt.Errorf("ai: decode response: %w", err)
	}
	if len(out.Choices) == 0 || out.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("ai: no diagram code in response")
	}
	content := strings.TrimSpace(out.Choices[0].Message.Content)
	// Strip markdown code block if present
	if strings.HasPrefix(content, "```") {
		lines := strings.SplitN(content, "\n", 2)
		if len(lines) == 2 {
			content = strings.TrimSpace(lines[1])
		}
		content = strings.TrimSuffix(content, "```")
		content = strings.TrimSpace(content)
	}
	return content, nil
}

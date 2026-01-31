package service

import (
	"context"

	"github.com/devenock/d_weaver/internal/ai/client"
	"github.com/devenock/d_weaver/internal/common"
)

// Service implements AI generate-diagram business logic.
type Service struct {
	gen client.Generator
}

// New returns an AI service using the given generator.
func New(gen client.Generator) *Service {
	return &Service{gen: gen}
}

// GenerateDiagram returns Mermaid diagram code for the given description and optional diagram type.
func (s *Service) GenerateDiagram(ctx context.Context, description, diagramType string) (string, error) {
	if description == "" {
		return "", common.NewDomainError(common.CodeInvalidInput, "Description is required.", nil)
	}
	mermaid, err := s.gen.GenerateDiagram(ctx, description, diagramType)
	if err != nil {
		if err.Error() == "rate limit exceeded" {
			return "", common.NewDomainError("rate_limit_exceeded", "Rate limit exceeded. Please try again later.", err)
		}
		if err.Error() == "payment required" {
			return "", common.NewDomainError("payment_required", "Payment required. Please add credits to your workspace.", err)
		}
		return "", common.NewDomainError(common.CodeInternalError, "Failed to generate diagram.", err)
	}
	return mermaid, nil
}

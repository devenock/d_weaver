package service

// Service implements auth business logic. Calls Repository and external deps (e.g. email, tokens).
type Service struct {
	repo Repository
	// tokenGen, hasher, emailSender, etc. when implemented
}

// Repository is the auth persistence interface. Implemented by auth.Repository.
// Add CreateUser, GetUserByEmail, etc. when implementing.
type Repository interface{}

// New returns an auth service that uses the given repository.
func New(repo Repository) *Service {
	return &Service{repo: repo}
}

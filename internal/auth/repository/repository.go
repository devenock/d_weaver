package repository

// Repository implements auth persistence (users, refresh tokens, password reset).
// Uses pgxpool/sqlc; parameterized queries only. No business logic.
type Repository struct {
	// db *pgxpool.Pool when DB is wired
}

// New returns an auth repository. Caller must pass a DB pool once config and migrations exist.
func New( /* db *pgxpool.Pool */ ) *Repository {
	return &Repository{}
}

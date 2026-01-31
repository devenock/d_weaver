package db

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// PostgreSQL unique_violation error code.
const PgCodeUniqueViolation = "23505"

// IsUniqueViolation reports whether err is a PostgreSQL unique constraint violation.
func IsUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == PgCodeUniqueViolation
}

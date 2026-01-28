package repository

import (
	"context"
	"errors"
	"time"

	"github.com/devenock/d_weaver/internal/auth/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository implements auth persistence (users, refresh tokens, password reset).
// Parameterized queries only. No business logic.
type Repository struct {
	pool *pgxpool.Pool
}

// New returns an auth repository using the given pool.
func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// CreateUser inserts a user and returns it. Returns error if email exists (unique violation).
func (r *Repository) CreateUser(ctx context.Context, email, passwordHash string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2)
		 RETURNING id, email, password_hash, email_verified, created_at, updated_at`,
		email, passwordHash,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// GetUserByEmail returns the user by email or nil if not found.
func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, email_verified, created_at, updated_at FROM users WHERE email = $1`,
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// GetUserByID returns the user by id or nil if not found.
func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, email_verified, created_at, updated_at FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// CreateRefreshToken inserts a refresh token and returns it.
func (r *Repository) CreateRefreshToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (*model.RefreshToken, error) {
	var t model.RefreshToken
	err := r.pool.QueryRow(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at`,
		userID, tokenHash, expiresAt,
	).Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.RevokedAt, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetRefreshTokenByTokenHash returns the token and user if found and not revoked/expired.
func (r *Repository) GetRefreshTokenByTokenHash(ctx context.Context, tokenHash string) (*model.RefreshToken, *model.User, error) {
	var t model.RefreshToken
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
		 FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
		tokenHash,
	).Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.RevokedAt, &t.CreatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	u, err := r.GetUserByID(ctx, t.UserID)
	if err != nil || u == nil {
		return nil, nil, err
	}
	return &t, u, nil
}

// RevokeRefreshToken sets revoked_at for the token with the given id.
func (r *Repository) RevokeRefreshToken(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, id)
	return err
}

// RevokeRefreshTokenByHash revokes the token with the given token hash.
func (r *Repository) RevokeRefreshTokenByHash(ctx context.Context, tokenHash string) error {
	_, err := r.pool.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, tokenHash)
	return err
}

// CreatePasswordResetToken inserts a password reset token.
func (r *Repository) CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	return err
}

// GetPasswordResetTokenByTokenHash returns the token and user if valid and not used/expired.
func (r *Repository) GetPasswordResetTokenByTokenHash(ctx context.Context, tokenHash string) (*model.PasswordResetToken, *model.User, error) {
	var t model.PasswordResetToken
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, token_hash, expires_at, used_at, created_at
		 FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
		tokenHash,
	).Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.UsedAt, &t.CreatedAt)
	if err != nil {
		if isErrNoRows(err) {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	u, err := r.GetUserByID(ctx, t.UserID)
	if err != nil || u == nil {
		return nil, nil, err
	}
	return &t, u, nil
}

// MarkPasswordResetUsed sets used_at for the given token id.
func (r *Repository) MarkPasswordResetUsed(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, id)
	return err
}

// UpdateUserPassword updates password_hash for the user.
func (r *Repository) UpdateUserPassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
		passwordHash, userID,
	)
	return err
}

func isErrNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

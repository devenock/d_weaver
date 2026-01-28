package jwt

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"os"
	"time"

	"github.com/devenock/d_weaver/internal/config"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims holds standard JWT claims plus user identifiers (PDF: access token 15min).
type Claims struct {
	jwt.RegisteredClaims
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}

// Issuer issues access tokens (RS256 when keys are set, else HS256 for dev).
type Issuer struct {
	cfg *config.JWTConfig
	// privateKey for RS256; keyBytes for HS256
	key    interface{}
	method jwt.SigningMethod
}

// NewIssuer builds an Issuer from app JWT config. Uses RS256 when PrivateKeyPath/PublicKeyPath are set.
func NewIssuer(cfg *config.JWTConfig) (*Issuer, error) {
	if cfg == nil {
		return nil, fmt.Errorf("jwt: config is required")
	}
	// Prefer RS256: load PEM keys from paths
	if cfg.PrivateKeyPath != "" {
		key, err := loadRSAPrivateKey(cfg.PrivateKeyPath)
		if err != nil {
			return nil, fmt.Errorf("jwt: load private key: %w", err)
		}
		return &Issuer{cfg: cfg, key: key, method: jwt.SigningMethodRS256}, nil
	}
	// Fallback: HS256 with secret (dev only)
	if cfg.RefreshTokenSecret == "" {
		return nil, fmt.Errorf("jwt: either PrivateKeyPath or RefreshTokenSecret is required")
	}
	return &Issuer{cfg: cfg, key: []byte(cfg.RefreshTokenSecret), method: jwt.SigningMethodHS256}, nil
}

// IssueAccessToken returns a signed access token for the user (PDF: 15min).
func (i *Issuer) IssueAccessToken(userID uuid.UUID, email string) (string, error) {
	dur := time.Duration(i.cfg.AccessDurationMinutes) * time.Minute
	now := time.Now()
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			Issuer:    i.cfg.Issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(dur)),
			ID:        uuid.New().String(),
		},
		UserID: userID.String(),
		Email:  email,
	}
	tok := jwt.NewWithClaims(i.method, claims)
	return tok.SignedString(i.key)
}

// ValidateAccessToken parses and validates the token, returns userID and email or error.
func (i *Issuer) ValidateAccessToken(tokenString string) (userID uuid.UUID, email string, err error) {
	var key interface{} = i.key
	if i.method == jwt.SigningMethodRS256 {
		key, err = loadRSAPublicKey(i.cfg.PublicKeyPath)
		if err != nil {
			return uuid.Nil, "", fmt.Errorf("jwt: load public key: %w", err)
		}
	}
	tok, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if t.Method != i.method {
			return nil, fmt.Errorf("unexpected method: %v", t.Header["alg"])
		}
		return key, nil
	})
	if err != nil {
		return uuid.Nil, "", err
	}
	c, ok := tok.Claims.(*Claims)
	if !ok || !tok.Valid {
		return uuid.Nil, "", fmt.Errorf("invalid token")
	}
	id, err := uuid.Parse(c.UserID)
	if err != nil {
		return uuid.Nil, "", fmt.Errorf("invalid user_id in token")
	}
	return id, c.Email, nil
}

// GenerateRefreshToken returns a random token and its hash for storage (caller stores hash).
func GenerateRefreshToken() (plain, hash string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	plain = hex.EncodeToString(b)
	hash = HashRefreshToken(plain)
	return plain, hash, nil
}

// HashRefreshToken returns the storage hash for a refresh token (same as stored by GenerateRefreshToken).
func HashRefreshToken(plain string) string {
	h := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(h[:])
}

func sha256Hex(s string) string {
	return HashRefreshToken(s)
}

func loadRSAPrivateKey(path string) (interface{}, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	block, _ := pem.Decode(b)
	if block == nil {
		return nil, fmt.Errorf("no PEM block in %s", path)
	}
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

func loadRSAPublicKey(path string) (interface{}, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	block, _ := pem.Decode(b)
	if block == nil {
		return nil, fmt.Errorf("no PEM block in %s", path)
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		pk1, err := x509.ParsePKCS1PublicKey(block.Bytes)
		return pk1, err
	}
	return pub, nil
}

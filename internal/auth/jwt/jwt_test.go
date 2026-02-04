package jwt

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/devenock/d_weaver/config"
	"github.com/google/uuid"
)

func TestNewIssuer_HS256(t *testing.T) {
	cfg := &config.JWTConfig{
		AccessDurationMinutes: 15,
		RefreshDurationDays:   7,
		RefreshTokenSecret:    "test-secret",
	}
	issuer, err := NewIssuer(cfg)
	if err != nil {
		t.Fatalf("NewIssuer: %v", err)
	}
	userID := uuid.New()
	email := "user@example.com"
	tok, err := issuer.IssueAccessToken(userID, email)
	if err != nil {
		t.Fatalf("IssueAccessToken: %v", err)
	}
	if tok == "" {
		t.Fatal("expected non-empty token")
	}
	gotID, gotEmail, err := issuer.ValidateAccessToken(tok)
	if err != nil {
		t.Fatalf("ValidateAccessToken: %v", err)
	}
	if gotID != userID || gotEmail != email {
		t.Errorf("got userID=%s email=%s, want userID=%s email=%s", gotID, gotEmail, userID, email)
	}
}

func TestNewIssuer_RS256_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	privPath := filepath.Join(dir, "priv.pem")
	pubPath := filepath.Join(dir, "pub.pem")

	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("GenerateKey: %v", err)
	}
	privPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	if err := os.WriteFile(privPath, privPEM, 0600); err != nil {
		t.Fatalf("write private key: %v", err)
	}
	pubPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PUBLIC KEY", Bytes: x509.MarshalPKCS1PublicKey(&key.PublicKey)})
	if err := os.WriteFile(pubPath, pubPEM, 0644); err != nil {
		t.Fatalf("write public key: %v", err)
	}

	cfg := &config.JWTConfig{
		AccessDurationMinutes: 15,
		RefreshDurationDays:   7,
		PrivateKeyPath:        privPath,
		PublicKeyPath:         pubPath,
		Issuer:                "test",
	}
	issuer, err := NewIssuer(cfg)
	if err != nil {
		t.Fatalf("NewIssuer: %v", err)
	}
	userID := uuid.New()
	email := "rs256@example.com"
	tok, err := issuer.IssueAccessToken(userID, email)
	if err != nil {
		t.Fatalf("IssueAccessToken: %v", err)
	}
	if tok == "" {
		t.Fatal("expected non-empty token")
	}
	gotID, gotEmail, err := issuer.ValidateAccessToken(tok)
	if err != nil {
		t.Fatalf("ValidateAccessToken: %v", err)
	}
	if gotID != userID || gotEmail != email {
		t.Errorf("got userID=%s email=%s, want userID=%s email=%s", gotID, gotEmail, userID, email)
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	plain, hash, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken: %v", err)
	}
	if plain == "" || hash == "" {
		t.Error("expected non-empty plain and hash")
	}
	if hash != HashRefreshToken(plain) {
		t.Error("hash should match HashRefreshToken(plain)")
	}
	plain2, hash2, _ := GenerateRefreshToken()
	if plain == plain2 || hash == hash2 {
		t.Error("tokens should be unique")
	}
}

func TestNewIssuer_RequiresConfig(t *testing.T) {
	_, err := NewIssuer(nil)
	if err == nil {
		t.Fatal("expected error for nil config")
	}
}

func TestNewIssuer_RequiresKeyOrSecret(t *testing.T) {
	_, err := NewIssuer(&config.JWTConfig{
		AccessDurationMinutes: 15,
		RefreshDurationDays:   7,
		// no PrivateKeyPath, no RefreshTokenSecret
	})
	if err == nil {
		t.Fatal("expected error when neither key path nor secret set")
	}
}

func TestValidateAccessToken_Expired(t *testing.T) {
	cfg := &config.JWTConfig{
		AccessDurationMinutes: 0, // already expired
		RefreshDurationDays:   7,
		RefreshTokenSecret:    "secret",
	}
	issuer, err := NewIssuer(cfg)
	if err != nil {
		t.Fatalf("NewIssuer: %v", err)
	}
	tok, err := issuer.IssueAccessToken(uuid.New(), "a@b.com")
	if err != nil {
		t.Fatalf("IssueAccessToken: %v", err)
	}
	// Token with exp in the past may still parse; validation checks exp
	time.Sleep(100 * time.Millisecond)
	_, _, err = issuer.ValidateAccessToken(tok)
	if err == nil {
		t.Error("expected error for expired token")
	}
}

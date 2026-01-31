package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

// Config holds application configuration from env/files (viper).
type Config struct {
	Server    ServerConfig    `mapstructure:"server"`
	DB        DBConfig        `mapstructure:"db"`
	Redis     RedisConfig     `mapstructure:"redis"`
	JWT       JWTConfig       `mapstructure:"jwt"`
	RateLimit RateLimitConfig `mapstructure:"rate_limit"`
	CORS      CORSConfig      `mapstructure:"cors"`
	Upload    UploadConfig    `mapstructure:"upload"`
	AI        AIConfig        `mapstructure:"ai"`
	Log       LogConfig       `mapstructure:"log"`
	Web       WebConfig       `mapstructure:"web"`
}

// WebConfig for serving the htmx static frontend.
type WebConfig struct {
	StaticDir string `mapstructure:"static_dir"` // e.g. web/static
}

// LogConfig for application logging.
type LogConfig struct {
	Level string `mapstructure:"level"` // debug, info, warn, error (default info)
}

// AIConfig for generate-diagram (OpenAI-compatible chat endpoint).
type AIConfig struct {
	APIKey  string `mapstructure:"api_key"`  // Bearer token for the AI gateway
	BaseURL string `mapstructure:"base_url"` // e.g. https://ai.gateway.lovable.dev/v1
	Model   string `mapstructure:"model"`   // e.g. google/gemini-2.5-flash
}

// UploadConfig for diagram image uploads (PDF: 10MB limit, type checks).
type UploadConfig struct {
	Dir      string // directory to store files (default "uploads")
	MaxBytes int    // max file size in bytes (default 10MB)
}

type ServerConfig struct {
	Host         string
	Port         int
	ReadTimeout  int // seconds
	WriteTimeout int // seconds
}

type DBConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime int // seconds
	MigrationsDir   string
}

type RedisConfig struct {
	URL      string
	Password string
	DB       int
}

type JWTConfig struct {
	AccessDurationMinutes int    `mapstructure:"access_duration_minutes"`
	RefreshDurationDays   int    `mapstructure:"refresh_duration_days"`
	PrivateKeyPath        string `mapstructure:"private_key_path"` // RS256 private key path
	PublicKeyPath         string `mapstructure:"public_key_path"`  // RS256 public key path
	Issuer                string `mapstructure:"issuer"`
	RefreshTokenSecret    string `mapstructure:"refresh_token_secret"`
}

type RateLimitConfig struct {
	RequestsPerMinute int  `mapstructure:"requests_per_minute"`
	Enabled           bool `mapstructure:"enabled"`
}

type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

// Load reads config from env and optional config file. Prefer env.
func Load() (*Config, error) {
	v := viper.New()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()
	// Unmarshal does not apply AutomaticEnv to nested keys; bind so Docker/env DB_URL is used.
	v.BindEnv("db.url", "DB_URL")
	v.BindEnv("redis.url", "REDIS_URL")

	// defaults
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 8200)
	v.SetDefault("server.read_timeout", 30)
	v.SetDefault("server.write_timeout", 30)
	// Default DB URL matches Docker Compose Postgres (deployments/docker-compose.yml) when API runs on host.
	v.SetDefault("db.url", "postgres://dweaver:dweaver_dev_password@localhost:5432/dweaver?sslmode=disable")
	v.SetDefault("db.max_open_conns", 25)
	v.SetDefault("db.max_idle_conns", 5)
	v.SetDefault("db.conn_max_lifetime", 300)
	v.SetDefault("db.migrations_dir", "migrations")
	v.SetDefault("redis.db", 0)
	v.SetDefault("jwt.access_duration_minutes", 15)
	v.SetDefault("jwt.refresh_duration_days", 7)
	v.SetDefault("jwt.issuer", "d_weaver")
	v.SetDefault("jwt.refresh_token_secret", "dev-secret-change-in-production") // use RS256 keys in prod
	v.SetDefault("rate_limit.requests_per_minute", 100)
	v.SetDefault("rate_limit.enabled", true)
	v.SetDefault("cors.allowed_origins", []string{"*"})
	v.SetDefault("cors.allowed_methods", []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"})
	v.SetDefault("cors.allowed_headers", []string{"Authorization", "Content-Type", "X-Request-ID"})
	v.SetDefault("upload.dir", "uploads")
	v.SetDefault("upload.max_bytes", 10*1024*1024) // 10MB
	v.SetDefault("ai.base_url", "https://ai.gateway.lovable.dev/v1")
	v.SetDefault("ai.model", "google/gemini-2.5-flash")
	v.SetDefault("log.level", "info")
	v.SetDefault("web.static_dir", "web/static")

	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("./config")
	v.AddConfigPath("../config")
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("config: read file: %w", err)
		}
		// no file is ok, use env/defaults
	}

	var c Config
	if err := v.Unmarshal(&c); err != nil {
		return nil, fmt.Errorf("config: unmarshal: %w", err)
	}
	// Viper Unmarshal does not always apply bound env for nested keys; override from env so Docker/compose DB_URL is used.
	if u := os.Getenv("DB_URL"); u != "" {
		c.DB.URL = u
	}
	if u := os.Getenv("REDIS_URL"); u != "" {
		c.Redis.URL = u
	}
	if d := os.Getenv("WEB_STATIC_DIR"); d != "" {
		c.Web.StaticDir = d
	}
	return &c, nil
}

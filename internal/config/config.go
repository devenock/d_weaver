package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config holds application configuration from env/files (viper).
type Config struct {
	Server    ServerConfig   `mapstructure:"server"`
	DB        DBConfig       `mapstructure:"db"`
	Redis     RedisConfig    `mapstructure:"redis"`
	JWT       JWTConfig      `mapstructure:"jwt"`
	RateLimit RateLimitConfig `mapstructure:"rate_limit"`
	CORS      CORSConfig     `mapstructure:"cors"`
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
	PublicKeyPath         string `mapstructure:"public_key_path"`   // RS256 public key path
	Issuer                string `mapstructure:"issuer"`
	RefreshTokenSecret    string `mapstructure:"refresh_token_secret"`
}

type RateLimitConfig struct {
	RequestsPerMinute int
	Enabled          bool
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

	// defaults
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.read_timeout", 30)
	v.SetDefault("server.write_timeout", 30)
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
	return &c, nil
}

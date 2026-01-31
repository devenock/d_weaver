package middleware

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisStore implements RedisRateLimitStore using go-redis.
type RedisStore struct {
	client *redis.Client
}

// NewRedisStore returns a RedisRateLimitStore. client must not be nil.
func NewRedisStore(client *redis.Client) *RedisStore {
	return &RedisStore{client: client}
}

// Incr increments the key and returns the new value.
func (r *RedisStore) Incr(key string) (int64, error) {
	return r.client.Incr(context.Background(), key).Result()
}

// Expire sets the key TTL.
func (r *RedisStore) Expire(key string, ttl time.Duration) error {
	return r.client.Expire(context.Background(), key, ttl).Err()
}

// Get returns the key value (not used by RedisLimiter but part of interface).
func (r *RedisStore) Get(key string) (string, error) {
	return r.client.Get(context.Background(), key).Result()
}

var _ RedisRateLimitStore = (*RedisStore)(nil)

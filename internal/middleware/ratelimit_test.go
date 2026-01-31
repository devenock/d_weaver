package middleware

import (
	"testing"
	"time"
)

func TestMemoryLimiter_Allow(t *testing.T) {
	limit := 2
	window := time.Minute
	l := NewMemoryLimiter(limit, window)
	key := "user:test-id"
	allowed, err := l.Allow(key)
	if err != nil {
		t.Fatal(err)
	}
	if !allowed {
		t.Error("first request should be allowed")
	}
	allowed, _ = l.Allow(key)
	if !allowed {
		t.Error("second request should be allowed")
	}
	allowed, _ = l.Allow(key)
	if allowed {
		t.Error("third request should be denied")
	}
}

func TestMemoryLimiter_DifferentKeys(t *testing.T) {
	l := NewMemoryLimiter(1, time.Minute)
	allowed, _ := l.Allow("key1")
	if !allowed {
		t.Error("key1 should be allowed")
	}
	allowed, _ = l.Allow("key1")
	if allowed {
		t.Error("key1 second should be denied")
	}
	allowed, _ = l.Allow("key2")
	if !allowed {
		t.Error("key2 should be allowed")
	}
}

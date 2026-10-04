package auth

import (
	"net/http"
	"strconv"
	"sync"
	"time"
)

type rateLimitEntry struct {
	count   int
	resetAt time.Time
}

type RateLimiter struct {
	mu        sync.Mutex
	entries   map[string]rateLimitEntry
	limit     int
	window    time.Duration
	now       func() time.Time
	cleanupAt time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		entries:   make(map[string]rateLimitEntry),
		limit:     limit,
		window:    window,
		now:       time.Now,
		cleanupAt: time.Now().Add(window),
	}
}

func (l *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		now := l.now()
		key := r.RemoteAddr

		l.mu.Lock()
		if !now.Before(l.cleanupAt) {
			for entryKey, candidate := range l.entries {
				if !now.Before(candidate.resetAt) {
					delete(l.entries, entryKey)
				}
			}
			l.cleanupAt = now.Add(l.window)
		}
		entry, found := l.entries[key]
		if !found || !now.Before(entry.resetAt) {
			entry = rateLimitEntry{resetAt: now.Add(l.window)}
		}
		entry.count++
		l.entries[key] = entry
		allowed := entry.count <= l.limit
		retryAfter := max(1, int(entry.resetAt.Sub(now).Seconds()+0.999))
		l.mu.Unlock()

		if !allowed {
			w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
			http.Error(w, "too many requests", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

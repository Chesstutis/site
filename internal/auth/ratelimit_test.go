package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiter(t *testing.T) {
	now := time.Date(2026, time.October, 4, 0, 0, 0, 0, time.UTC)
	limiter := NewRateLimiter(2, time.Minute)
	limiter.now = func() time.Time { return now }

	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	request := func(remoteAddress string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		req.RemoteAddr = remoteAddress
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, req)
		return response
	}

	if response := request("192.0.2.1"); response.Code != http.StatusNoContent {
		t.Fatalf("first request status = %d", response.Code)
	}
	if response := request("192.0.2.1"); response.Code != http.StatusNoContent {
		t.Fatalf("second request status = %d", response.Code)
	}
	if response := request("192.0.2.1"); response.Code != http.StatusTooManyRequests {
		t.Fatalf("limited request status = %d", response.Code)
	} else if response.Header().Get("Retry-After") == "" {
		t.Fatal("limited response did not include Retry-After")
	}
	if response := request("192.0.2.2"); response.Code != http.StatusNoContent {
		t.Fatalf("different client status = %d", response.Code)
	}

	now = now.Add(time.Minute)
	if response := request("192.0.2.1"); response.Code != http.StatusNoContent {
		t.Fatalf("request after reset status = %d", response.Code)
	}
}

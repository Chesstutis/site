package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/chesstutis/site/internal/auth"
	"github.com/chesstutis/site/internal/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

type profileHandlerStore struct {
	user           db.User
	stats          db.GetPuzzleStatsRow
	getUserErr     error
	deleteUserErr  error
	getStatsErr    error
	requestedID    int64
	deletedUserID  int64
	statsForUserID int64
}

func (s *profileHandlerStore) Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, errors.New("unexpected exec")
}

func (s *profileHandlerStore) Query(context.Context, string, ...interface{}) (pgx.Rows, error) {
	return nil, errors.New("unexpected query")
}

func (s *profileHandlerStore) QueryRow(_ context.Context, query string, args ...interface{}) pgx.Row {
	switch {
	case strings.Contains(query, "-- name: GetUserById"):
		s.requestedID = args[0].(int64)
		return accountRow{user: s.user, err: s.getUserErr}
	case strings.Contains(query, "-- name: DeleteUser"):
		s.deletedUserID = args[0].(int64)
		return accountRow{user: s.user, err: s.deleteUserErr}
	case strings.Contains(query, "-- name: GetPuzzleStats"):
		s.statsForUserID = args[0].(int64)
		return profileStatsRow{stats: s.stats, err: s.getStatsErr}
	default:
		return accountRow{err: errors.New("unexpected query row")}
	}
}

type profileStatsRow struct {
	stats db.GetPuzzleStatsRow
	err   error
}

func (r profileStatsRow) Scan(dest ...interface{}) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != 3 {
		return errors.New("unexpected scan destination count")
	}
	*dest[0].(*int64) = r.stats.Solved
	*dest[1].(*int64) = r.stats.Unsolved
	*dest[2].(*int64) = r.stats.Total
	return nil
}

func newProfileHandlerStore() *profileHandlerStore {
	now := time.Now().UTC()
	return &profileHandlerStore{
		user: db.User{
			ID:               42,
			Email:            "player@example.com",
			PasswordHash:     "must-not-be-returned",
			ChessComUsername: "player-one",
			CreatedAt:        pgtype.Timestamptz{Time: now.Add(-time.Hour), Valid: true},
			UpdatedAt:        pgtype.Timestamptz{Time: now, Valid: true},
		},
		stats: db.GetPuzzleStatsRow{Solved: 7, Unsolved: 3, Total: 10},
	}
}

func performProtectedHandlerRequest(t *testing.T, handler http.HandlerFunc, method, path string, authenticated bool) *httptest.ResponseRecorder {
	t.Helper()

	request := httptest.NewRequest(method, path, nil)
	if authenticated {
		token, err := auth.MakeJWT(42, testJWTSecret, time.Hour)
		if err != nil {
			t.Fatalf("make access token: %v", err)
		}
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response := httptest.NewRecorder()
	auth.RequireAuth(testJWTSecret)(handler).ServeHTTP(response, request)
	return response
}

func TestGetMe(t *testing.T) {
	t.Run("rejects missing user context", func(t *testing.T) {
		store := newProfileHandlerStore()
		request := httptest.NewRequest(http.MethodGet, "/api/me", nil)
		response := httptest.NewRecorder()
		New(db.New(store), nil, testJWTSecret).GetMe(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
	})

	t.Run("returns authenticated account without password hash", func(t *testing.T) {
		store := newProfileHandlerStore()
		handler := New(db.New(store), nil, testJWTSecret)
		response := performProtectedHandlerRequest(t, handler.GetMe, http.MethodGet, "/api/me", true)

		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusOK, response.Body.String())
		}
		if store.requestedID != 42 {
			t.Fatalf("queried user ID = %d, want 42", store.requestedID)
		}
		var body map[string]interface{}
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if body["email"] != store.user.Email || body["chess_com_username"] != store.user.ChessComUsername {
			t.Fatalf("unexpected account response: %#v", body)
		}
		if _, exposed := body["password_hash"]; exposed {
			t.Fatal("response exposed password_hash")
		}
	})

	tests := []struct {
		name          string
		authenticated bool
		configure     func(*profileHandlerStore)
		wantStatus    int
	}{
		{"requires authentication", false, nil, http.StatusUnauthorized},
		{"handles persistence failure", true, func(store *profileHandlerStore) {
			store.getUserErr = errors.New("database unavailable")
		}, http.StatusInternalServerError},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newProfileHandlerStore()
			if test.configure != nil {
				test.configure(store)
			}
			handler := New(db.New(store), nil, testJWTSecret)
			response := performProtectedHandlerRequest(t, handler.GetMe, http.MethodGet, "/api/me", test.authenticated)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}
		})
	}
}

func TestPuzzleStats(t *testing.T) {
	t.Run("rejects missing user context", func(t *testing.T) {
		store := newProfileHandlerStore()
		request := httptest.NewRequest(http.MethodGet, "/api/me/puzzles/stats", nil)
		response := httptest.NewRecorder()
		New(db.New(store), nil, testJWTSecret).PuzzleStats(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
	})

	t.Run("returns stats for authenticated user", func(t *testing.T) {
		store := newProfileHandlerStore()
		handler := New(db.New(store), nil, testJWTSecret)
		response := performProtectedHandlerRequest(t, handler.PuzzleStats, http.MethodGet, "/api/me/puzzles/stats", true)

		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusOK, response.Body.String())
		}
		if store.statsForUserID != 42 {
			t.Fatalf("stats user ID = %d, want 42", store.statsForUserID)
		}
		var body db.GetPuzzleStatsRow
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if body != store.stats {
			t.Fatalf("stats = %+v, want %+v", body, store.stats)
		}
	})

	tests := []struct {
		name          string
		authenticated bool
		configure     func(*profileHandlerStore)
		wantStatus    int
	}{
		{"requires authentication", false, nil, http.StatusUnauthorized},
		{"handles persistence failure", true, func(store *profileHandlerStore) {
			store.getStatsErr = errors.New("database unavailable")
		}, http.StatusInternalServerError},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newProfileHandlerStore()
			if test.configure != nil {
				test.configure(store)
			}
			handler := New(db.New(store), nil, testJWTSecret)
			response := performProtectedHandlerRequest(t, handler.PuzzleStats, http.MethodGet, "/api/me/puzzles/stats", test.authenticated)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}
		})
	}
}

func TestDeleteMe(t *testing.T) {
	t.Run("rejects missing user context", func(t *testing.T) {
		store := newProfileHandlerStore()
		request := httptest.NewRequest(http.MethodDelete, "/api/me", nil)
		response := httptest.NewRecorder()
		New(db.New(store), nil, testJWTSecret).DeleteMe(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
	})

	t.Run("deletes and returns authenticated account", func(t *testing.T) {
		store := newProfileHandlerStore()
		handler := New(db.New(store), nil, testJWTSecret)
		response := performProtectedHandlerRequest(t, handler.DeleteMe, http.MethodDelete, "/api/me", true)

		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusOK, response.Body.String())
		}
		if store.deletedUserID != 42 {
			t.Fatalf("deleted user ID = %d, want 42", store.deletedUserID)
		}
		var body Me
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if body.ID != store.user.ID || body.Email != store.user.Email {
			t.Fatalf("unexpected deleted account response: %+v", body)
		}
	})

	tests := []struct {
		name          string
		authenticated bool
		configure     func(*profileHandlerStore)
		wantStatus    int
	}{
		{"requires authentication", false, nil, http.StatusUnauthorized},
		{"handles persistence failure", true, func(store *profileHandlerStore) {
			store.deleteUserErr = errors.New("database unavailable")
		}, http.StatusInternalServerError},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newProfileHandlerStore()
			if test.configure != nil {
				test.configure(store)
			}
			handler := New(db.New(store), nil, testJWTSecret)
			response := performProtectedHandlerRequest(t, handler.DeleteMe, http.MethodDelete, "/api/me", test.authenticated)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}
		})
	}
}

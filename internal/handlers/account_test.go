package handlers

import (
	"context"
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

const testJWTSecret = "account-handler-test-secret"

type accountStore struct {
	user                   db.User
	getUserErr             error
	changePasswordErr      error
	changeUsernameErr      error
	passwordChanged        bool
	usernameChanged        bool
	deleteQueryWasExecuted bool
}

type accountHTTPDoer func(*http.Request) (*http.Response, error)

func (do accountHTTPDoer) Do(request *http.Request) (*http.Response, error) {
	return do(request)
}

func newAccountHandler(store *accountStore) *Handler {
	handler := New(db.New(store), nil, testJWTSecret)
	handler.ChessComClient = accountHTTPDoer(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       http.NoBody,
		}, nil
	})
	return handler
}

func (s *accountStore) Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}

func (s *accountStore) Query(context.Context, string, ...interface{}) (pgx.Rows, error) {
	return nil, errors.New("unexpected query")
}

func (s *accountStore) QueryRow(_ context.Context, query string, args ...interface{}) pgx.Row {
	switch {
	case strings.Contains(query, "-- name: GetUserById"):
		return accountRow{user: s.user, err: s.getUserErr}
	case strings.Contains(query, "-- name: ChangePassword"):
		if s.changePasswordErr != nil {
			return accountRow{err: s.changePasswordErr}
		}
		s.user.PasswordHash = args[0].(string)
		s.user.UpdatedAt = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
		s.passwordChanged = true
		return accountRow{user: s.user}
	case strings.Contains(query, "-- name: ChangeChessComUsername"):
		if s.changeUsernameErr != nil {
			return accountRow{err: s.changeUsernameErr}
		}
		s.user.ChessComUsername = args[0].(string)
		s.user.UpdatedAt = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
		s.usernameChanged = true
		return accountRow{user: s.user}
	case strings.Contains(query, "-- name: DeleteUser"):
		s.deleteQueryWasExecuted = true
		return accountRow{user: s.user}
	default:
		return accountRow{err: errors.New("unexpected query row")}
	}
}

type accountRow struct {
	user db.User
	err  error
}

func (r accountRow) Scan(dest ...interface{}) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != 6 {
		return errors.New("unexpected scan destination count")
	}

	*dest[0].(*int64) = r.user.ID
	*dest[1].(*string) = r.user.Email
	*dest[2].(*string) = r.user.PasswordHash
	*dest[3].(*string) = r.user.ChessComUsername
	*dest[4].(*pgtype.Timestamptz) = r.user.CreatedAt
	*dest[5].(*pgtype.Timestamptz) = r.user.UpdatedAt
	return nil
}

func newAccountStore(t *testing.T) *accountStore {
	t.Helper()

	passwordHash, err := auth.HashPassword("current-password")
	if err != nil {
		t.Fatalf("hash current password: %v", err)
	}

	createdAt := time.Now().UTC().Add(-24 * time.Hour)
	updatedAt := createdAt.Add(time.Hour)
	return &accountStore{user: db.User{
		ID:               42,
		Email:            "player@example.com",
		PasswordHash:     passwordHash,
		ChessComUsername: "old-player",
		CreatedAt:        pgtype.Timestamptz{Time: createdAt, Valid: true},
		UpdatedAt:        pgtype.Timestamptz{Time: updatedAt, Valid: true},
	}}
}

func performAccountRequest(t *testing.T, store *accountStore, handler http.HandlerFunc, body string, authenticated bool) *httptest.ResponseRecorder {
	t.Helper()

	request := httptest.NewRequest(http.MethodPut, "/api/me/password", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	if authenticated {
		token, err := auth.MakeJWT(store.user.ID, testJWTSecret, time.Hour)
		if err != nil {
			t.Fatalf("make JWT: %v", err)
		}
		request.Header.Set("Authorization", "Bearer "+token)
	}

	recorder := httptest.NewRecorder()
	auth.RequireAuth(testJWTSecret)(handler).ServeHTTP(recorder, request)
	return recorder
}

func TestChangePassword(t *testing.T) {
	t.Run("rejects missing user context", func(t *testing.T) {
		store := newAccountStore(t)
		request := httptest.NewRequest(http.MethodPut, "/api/me/password", strings.NewReader(`{"current_password":"current-password","new_password":"new-password"}`))
		response := httptest.NewRecorder()
		newAccountHandler(store).ChangePassword(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
	})

	t.Run("changes password when current password is correct", func(t *testing.T) {
		store := newAccountStore(t)
		oldUpdatedAt := store.user.UpdatedAt.Time
		handler := newAccountHandler(store)

		response := performAccountRequest(t, store, handler.ChangePassword, `{"current_password":"current-password","new_password":"new-password"}`, true)

		if response.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusNoContent, response.Body.String())
		}
		if !store.passwordChanged {
			t.Fatal("expected password update query")
		}
		valid, err := auth.CheckPasswordHash("new-password", store.user.PasswordHash)
		if err != nil || !valid {
			t.Fatalf("new password does not match stored hash: valid=%v err=%v", valid, err)
		}
		if !store.user.UpdatedAt.Time.After(oldUpdatedAt) {
			t.Fatal("expected updated_at to advance")
		}
	})

	tests := []struct {
		name          string
		body          string
		authenticated bool
		configure     func(*accountStore)
		wantStatus    int
	}{
		{
			name:          "rejects incorrect current password",
			body:          `{"current_password":"wrong-password","new_password":"new-password"}`,
			authenticated: true,
			wantStatus:    http.StatusUnauthorized,
		},
		{
			name:          "rejects short new password",
			body:          `{"current_password":"current-password","new_password":"short"}`,
			authenticated: true,
			wantStatus:    http.StatusBadRequest,
		},
		{
			name:          "rejects malformed JSON",
			body:          `{"current_password":`,
			authenticated: true,
			wantStatus:    http.StatusBadRequest,
		},
		{
			name:          "rejects unknown fields",
			body:          `{"current_password":"current-password","new_password":"new-password","admin":true}`,
			authenticated: true,
			wantStatus:    http.StatusBadRequest,
		},
		{
			name:          "requires authentication",
			body:          `{"current_password":"current-password","new_password":"new-password"}`,
			authenticated: false,
			wantStatus:    http.StatusUnauthorized,
		},
		{
			name:          "handles user lookup failure",
			body:          `{"current_password":"current-password","new_password":"new-password"}`,
			authenticated: true,
			configure: func(store *accountStore) {
				store.getUserErr = errors.New("database unavailable")
			},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:          "handles persistence failure",
			body:          `{"current_password":"current-password","new_password":"new-password"}`,
			authenticated: true,
			configure: func(store *accountStore) {
				store.changePasswordErr = errors.New("database unavailable")
			},
			wantStatus: http.StatusInternalServerError,
		},
		{
			name:          "handles invalid stored hash",
			body:          `{"current_password":"current-password","new_password":"new-password"}`,
			authenticated: true,
			configure: func(store *accountStore) {
				store.user.PasswordHash = "invalid-hash"
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newAccountStore(t)
			if test.configure != nil {
				test.configure(store)
			}
			handler := newAccountHandler(store)

			response := performAccountRequest(t, store, handler.ChangePassword, test.body, test.authenticated)

			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d; body = %q", response.Code, test.wantStatus, response.Body.String())
			}
			if store.passwordChanged {
				t.Fatal("password changed after rejected request")
			}
		})
	}
}

func TestPatchMe(t *testing.T) {
	t.Run("rejects missing user context", func(t *testing.T) {
		store := newAccountStore(t)
		request := httptest.NewRequest(http.MethodPatch, "/api/me", strings.NewReader(`{"chess_com_username":"new-player"}`))
		response := httptest.NewRecorder()
		newAccountHandler(store).PatchMe(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
	})

	t.Run("trims and changes Chess.com username", func(t *testing.T) {
		store := newAccountStore(t)
		oldUpdatedAt := store.user.UpdatedAt.Time
		handler := newAccountHandler(store)

		response := performAccountRequest(t, store, handler.PatchMe, `{"chess_com_username":"  new-player  "}`, true)

		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusOK, response.Body.String())
		}
		if store.user.ChessComUsername != "new-player" {
			t.Fatalf("username = %q, want %q", store.user.ChessComUsername, "new-player")
		}
		if !store.user.UpdatedAt.Time.After(oldUpdatedAt) {
			t.Fatal("expected updated_at to advance")
		}
		if store.deleteQueryWasExecuted {
			t.Fatal("username update executed account deletion")
		}
	})

	tests := []struct {
		name          string
		body          string
		authenticated bool
		configure     func(*accountStore)
		configureHTTP func(*Handler)
		wantStatus    int
	}{
		{
			name:          "rejects empty username",
			body:          `{"chess_com_username":"   "}`,
			authenticated: true,
			wantStatus:    http.StatusBadRequest,
		},
		{
			name:          "rejects malformed JSON",
			body:          `{"chess_com_username":`,
			authenticated: true,
			wantStatus:    http.StatusBadRequest,
		},
		{
			name:          "rejects unknown fields",
			body:          `{"chess_com_username":"new-player","admin":true}`,
			authenticated: true,
			wantStatus:    http.StatusBadRequest,
		},
		{
			name:          "rejects missing Chess.com account",
			body:          `{"chess_com_username":"new-player"}`,
			authenticated: true,
			configureHTTP: func(handler *Handler) {
				handler.ChessComClient = accountHTTPDoer(func(*http.Request) (*http.Response, error) {
					return &http.Response{StatusCode: http.StatusNotFound, Body: http.NoBody}, nil
				})
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:          "handles Chess.com outage",
			body:          `{"chess_com_username":"new-player"}`,
			authenticated: true,
			configureHTTP: func(handler *Handler) {
				handler.ChessComClient = accountHTTPDoer(func(*http.Request) (*http.Response, error) {
					return nil, errors.New("network unavailable")
				})
			},
			wantStatus: http.StatusServiceUnavailable,
		},
		{
			name:          "requires authentication",
			body:          `{"chess_com_username":"new-player"}`,
			authenticated: false,
			wantStatus:    http.StatusUnauthorized,
		},
		{
			name:          "handles persistence failure",
			body:          `{"chess_com_username":"new-player"}`,
			authenticated: true,
			configure: func(store *accountStore) {
				store.changeUsernameErr = errors.New("database unavailable")
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newAccountStore(t)
			if test.configure != nil {
				test.configure(store)
			}
			handler := newAccountHandler(store)
			if test.configureHTTP != nil {
				test.configureHTTP(handler)
			}

			response := performAccountRequest(t, store, handler.PatchMe, test.body, test.authenticated)

			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d; body = %q", response.Code, test.wantStatus, response.Body.String())
			}
			if store.usernameChanged {
				t.Fatal("username changed after rejected request")
			}
			if store.deleteQueryWasExecuted {
				t.Fatal("username request executed account deletion")
			}
		})
	}
}

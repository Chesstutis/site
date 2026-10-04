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

type authHandlerStore struct {
	user                  db.User
	createUserErr         error
	getUserErr            error
	createRefreshTokenErr error
	createdEmail          string
	createdPasswordHash   string
	createdUsername       string
	lookupEmail           string
	refreshToken          db.RefreshToken
}

func (s *authHandlerStore) Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, errors.New("unexpected exec")
}

func (s *authHandlerStore) Query(context.Context, string, ...interface{}) (pgx.Rows, error) {
	return nil, errors.New("unexpected query")
}

func (s *authHandlerStore) QueryRow(_ context.Context, query string, args ...interface{}) pgx.Row {
	switch {
	case strings.Contains(query, "-- name: CreateUser"):
		s.createdEmail = args[0].(string)
		s.createdPasswordHash = args[1].(string)
		s.createdUsername = args[2].(string)
		if s.createUserErr != nil {
			return accountRow{err: s.createUserErr}
		}
		s.user.Email = s.createdEmail
		s.user.PasswordHash = s.createdPasswordHash
		s.user.ChessComUsername = s.createdUsername
		return accountRow{user: s.user}
	case strings.Contains(query, "-- name: GetUserByEmail"):
		s.lookupEmail = args[0].(string)
		return accountRow{user: s.user, err: s.getUserErr}
	case strings.Contains(query, "-- name: CreateRefreshToken"):
		if s.createRefreshTokenErr != nil {
			return refreshRow{err: s.createRefreshTokenErr}
		}
		now := time.Now().UTC()
		s.refreshToken = db.RefreshToken{
			TokenHash: args[0].(string),
			UserID:    args[1].(int64),
			CreatedAt: pgtype.Timestamptz{Time: now, Valid: true},
			UpdatedAt: pgtype.Timestamptz{Time: now, Valid: true},
			ExpiresAt: args[2].(pgtype.Timestamptz),
			FamilyID:  pgtype.UUID{Bytes: [16]byte{1}, Valid: true},
		}
		return refreshRow{token: s.refreshToken}
	default:
		return accountRow{err: errors.New("unexpected query row")}
	}
}

func newAuthHandlerStore(t *testing.T) *authHandlerStore {
	t.Helper()

	passwordHash, err := auth.HashPassword("correct-password")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	now := time.Now().UTC()
	return &authHandlerStore{user: db.User{
		ID:               42,
		Email:            "player@example.com",
		PasswordHash:     passwordHash,
		ChessComUsername: "player-one",
		CreatedAt:        pgtype.Timestamptz{Time: now.Add(-time.Hour), Valid: true},
		UpdatedAt:        pgtype.Timestamptz{Time: now, Valid: true},
	}}
}

func newAuthHandler(store *authHandlerStore, chessComStatus int) *Handler {
	handler := New(db.New(store), nil, testJWTSecret)
	handler.ChessComClient = accountHTTPDoer(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: chessComStatus, Body: http.NoBody}, nil
	})
	return handler
}

func performJSONRequest(handler http.HandlerFunc, method, path, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler(response, request)
	return response
}

func TestSignup(t *testing.T) {
	t.Run("creates normalized account and tokens", func(t *testing.T) {
		store := newAuthHandlerStore(t)
		handler := newAuthHandler(store, http.StatusOK)
		response := performJSONRequest(handler.Signup, http.MethodPost, "/api/auth/signup", `{
			"email":"  PLAYER@Example.COM ",
			"password":"correct-password",
			"chess_com_username":"  player-one  "
		}`)

		if response.Code != http.StatusCreated {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusCreated, response.Body.String())
		}
		if store.createdEmail != "player@example.com" || store.createdUsername != "player-one" {
			t.Fatalf("created account = (%q, %q), want normalized values", store.createdEmail, store.createdUsername)
		}
		validPassword, err := auth.CheckPasswordHash("correct-password", store.createdPasswordHash)
		if err != nil || !validPassword {
			t.Fatalf("stored password hash is invalid: valid=%v err=%v", validPassword, err)
		}

		var body AuthResponse
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if body.ID != store.user.ID || body.Email != store.createdEmail || body.RefreshToken == "" {
			t.Fatalf("unexpected signup response: %+v", body)
		}
		if _, err := auth.ValidateJWT(body.Token, testJWTSecret); err != nil {
			t.Fatalf("access token is invalid: %v", err)
		}
		if store.refreshToken.TokenHash != auth.HashRefreshToken(body.RefreshToken) {
			t.Fatal("refresh token was not stored as a hash")
		}
		if store.refreshToken.UserID != store.user.ID || !store.refreshToken.ExpiresAt.Time.After(time.Now().UTC()) {
			t.Fatalf("unexpected stored refresh token: %+v", store.refreshToken)
		}
	})

	tests := []struct {
		name           string
		body           string
		chessComStatus int
		configure      func(*authHandlerStore)
		wantStatus     int
	}{
		{"malformed JSON", `{`, http.StatusOK, nil, http.StatusBadRequest},
		{"unknown field", `{"email":"player@example.com","password":"correct-password","chess_com_username":"player-one","admin":true}`, http.StatusOK, nil, http.StatusBadRequest},
		{"invalid email", `{"email":"invalid","password":"correct-password","chess_com_username":"player-one"}`, http.StatusOK, nil, http.StatusBadRequest},
		{"short password", `{"email":"player@example.com","password":"short","chess_com_username":"player-one"}`, http.StatusOK, nil, http.StatusBadRequest},
		{"invalid username", `{"email":"player@example.com","password":"correct-password","chess_com_username":"12"}`, http.StatusOK, nil, http.StatusBadRequest},
		{"missing Chess.com account", `{"email":"player@example.com","password":"correct-password","chess_com_username":"player-one"}`, http.StatusNotFound, nil, http.StatusBadRequest},
		{"Chess.com unavailable", `{"email":"player@example.com","password":"correct-password","chess_com_username":"player-one"}`, http.StatusServiceUnavailable, nil, http.StatusServiceUnavailable},
		{"duplicate email", `{"email":"player@example.com","password":"correct-password","chess_com_username":"player-one"}`, http.StatusOK, func(store *authHandlerStore) {
			store.createUserErr = &pgconn.PgError{Code: "23505"}
		}, http.StatusConflict},
		{"user persistence failure", `{"email":"player@example.com","password":"correct-password","chess_com_username":"player-one"}`, http.StatusOK, func(store *authHandlerStore) {
			store.createUserErr = errors.New("database unavailable")
		}, http.StatusInternalServerError},
		{"refresh token persistence failure", `{"email":"player@example.com","password":"correct-password","chess_com_username":"player-one"}`, http.StatusOK, func(store *authHandlerStore) {
			store.createRefreshTokenErr = errors.New("database unavailable")
		}, http.StatusInternalServerError},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newAuthHandlerStore(t)
			if test.configure != nil {
				test.configure(store)
			}
			response := performJSONRequest(newAuthHandler(store, test.chessComStatus).Signup, http.MethodPost, "/api/auth/signup", test.body)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d; body = %q", response.Code, test.wantStatus, response.Body.String())
			}
		})
	}
}

func TestLogin(t *testing.T) {
	t.Run("returns access and refresh tokens", func(t *testing.T) {
		store := newAuthHandlerStore(t)
		response := performJSONRequest(newAuthHandler(store, http.StatusOK).Login, http.MethodPost, "/api/auth/login", `{
			"email":"  PLAYER@Example.COM ",
			"password":"correct-password"
		}`)

		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusOK, response.Body.String())
		}
		if store.lookupEmail != "player@example.com" {
			t.Fatalf("lookup email = %q, want normalized email", store.lookupEmail)
		}
		var body AuthResponse
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if _, err := auth.ValidateJWT(body.Token, testJWTSecret); err != nil {
			t.Fatalf("access token is invalid: %v", err)
		}
		if body.RefreshToken == "" || store.refreshToken.TokenHash != auth.HashRefreshToken(body.RefreshToken) {
			t.Fatal("refresh token was not returned and stored correctly")
		}
	})

	tests := []struct {
		name       string
		body       string
		configure  func(*authHandlerStore)
		wantStatus int
	}{
		{"malformed JSON", `{`, nil, http.StatusBadRequest},
		{"unknown field", `{"email":"player@example.com","password":"correct-password","admin":true}`, nil, http.StatusBadRequest},
		{"invalid email", `{"email":"invalid","password":"correct-password"}`, nil, http.StatusUnauthorized},
		{"short password", `{"email":"player@example.com","password":"short"}`, nil, http.StatusUnauthorized},
		{"unknown account", `{"email":"missing@example.com","password":"correct-password"}`, func(store *authHandlerStore) {
			store.getUserErr = pgx.ErrNoRows
		}, http.StatusUnauthorized},
		{"database failure", `{"email":"player@example.com","password":"correct-password"}`, func(store *authHandlerStore) {
			store.getUserErr = errors.New("database unavailable")
		}, http.StatusInternalServerError},
		{"incorrect password", `{"email":"player@example.com","password":"incorrect-password"}`, nil, http.StatusUnauthorized},
		{"invalid stored hash", `{"email":"player@example.com","password":"correct-password"}`, func(store *authHandlerStore) {
			store.user.PasswordHash = "invalid-hash"
		}, http.StatusInternalServerError},
		{"refresh token persistence failure", `{"email":"player@example.com","password":"correct-password"}`, func(store *authHandlerStore) {
			store.createRefreshTokenErr = errors.New("database unavailable")
		}, http.StatusInternalServerError},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newAuthHandlerStore(t)
			if test.configure != nil {
				test.configure(store)
			}
			response := performJSONRequest(newAuthHandler(store, http.StatusOK).Login, http.MethodPost, "/api/auth/login", test.body)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d; body = %q", response.Code, test.wantStatus, response.Body.String())
			}
		})
	}
}

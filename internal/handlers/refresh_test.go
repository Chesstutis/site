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

type refreshStore struct {
	tokens        map[string]db.RefreshToken
	familyRevoked bool
	revokeErr     error
	rotateErr     error
}

func (s *refreshStore) Exec(_ context.Context, query string, args ...interface{}) (pgconn.CommandTag, error) {
	switch {
	case strings.Contains(query, "-- name: RevokeRefreshTokenFamily"):
		if s.revokeErr != nil {
			return pgconn.CommandTag{}, s.revokeErr
		}
		s.familyRevoked = true
		return pgconn.NewCommandTag("UPDATE 2"), nil
	case strings.Contains(query, "-- name: RevokeRefreshToken"):
		if s.revokeErr != nil {
			return pgconn.CommandTag{}, s.revokeErr
		}
		token, ok := s.tokens[args[0].(string)]
		if !ok || token.RevokedAt.Valid {
			return pgconn.NewCommandTag("UPDATE 0"), nil
		}
		token.RevokedAt = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
		s.tokens[token.TokenHash] = token
		return pgconn.NewCommandTag("UPDATE 1"), nil
	default:
		return pgconn.CommandTag{}, errors.New("unexpected exec")
	}
}

func (s *refreshStore) Query(context.Context, string, ...interface{}) (pgx.Rows, error) {
	return nil, errors.New("unexpected query")
}

func (s *refreshStore) QueryRow(_ context.Context, query string, args ...interface{}) pgx.Row {
	switch {
	case strings.Contains(query, "-- name: GetRefreshToken"):
		token, ok := s.tokens[args[0].(string)]
		if !ok {
			return refreshRow{err: pgx.ErrNoRows}
		}
		return refreshRow{token: token}
	case strings.Contains(query, "-- name: RotateRefreshToken"):
		if s.rotateErr != nil {
			return refreshRow{err: s.rotateErr}
		}
		oldHash := args[2].(string)
		oldToken, ok := s.tokens[oldHash]
		if !ok || oldToken.RevokedAt.Valid || !time.Now().UTC().Before(oldToken.ExpiresAt.Time) {
			return refreshRow{err: pgx.ErrNoRows}
		}

		oldToken.RevokedAt = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
		s.tokens[oldHash] = oldToken
		newToken := db.RefreshToken{
			TokenHash: args[0].(string),
			UserID:    oldToken.UserID,
			CreatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
			UpdatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
			ExpiresAt: args[1].(pgtype.Timestamptz),
			FamilyID:  oldToken.FamilyID,
		}
		s.tokens[newToken.TokenHash] = newToken
		return refreshRow{token: newToken}
	default:
		return refreshRow{err: errors.New("unexpected query row")}
	}
}

type refreshRow struct {
	token db.RefreshToken
	err   error
}

func (r refreshRow) Scan(dest ...interface{}) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != 7 {
		return errors.New("unexpected scan destination count")
	}
	*dest[0].(*string) = r.token.TokenHash
	*dest[1].(*int64) = r.token.UserID
	*dest[2].(*pgtype.Timestamptz) = r.token.CreatedAt
	*dest[3].(*pgtype.Timestamptz) = r.token.UpdatedAt
	*dest[4].(*pgtype.Timestamptz) = r.token.ExpiresAt
	*dest[5].(*pgtype.Timestamptz) = r.token.RevokedAt
	*dest[6].(*pgtype.UUID) = r.token.FamilyID
	return nil
}

func newRefreshStore(rawToken string, revoked bool) *refreshStore {
	hash := auth.HashRefreshToken(rawToken)
	return &refreshStore{tokens: map[string]db.RefreshToken{
		hash: {
			TokenHash: hash,
			UserID:    42,
			CreatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
			UpdatedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
			ExpiresAt: pgtype.Timestamptz{Time: time.Now().UTC().Add(time.Hour), Valid: true},
			RevokedAt: pgtype.Timestamptz{Time: time.Now().UTC(), Valid: revoked},
			FamilyID:  pgtype.UUID{Bytes: [16]byte{1}, Valid: true},
		},
	}}
}

func performRefresh(t *testing.T, store *refreshStore, rawToken string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", nil)
	req.Header.Set("Authorization", "Bearer "+rawToken)
	response := httptest.NewRecorder()
	New(db.New(store), nil, testJWTSecret).Refresh(response, req)
	return response
}

func TestRefreshRotatesToken(t *testing.T) {
	const oldToken = "old-refresh-token"
	store := newRefreshStore(oldToken, false)
	response := performRefresh(t, store, oldToken)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusOK, response.Body.String())
	}

	var body struct {
		Token        string `json:"token"`
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if _, err := auth.ValidateJWT(body.Token, testJWTSecret); err != nil {
		t.Fatalf("response access token is invalid: %v", err)
	}
	if body.RefreshToken == "" || body.RefreshToken == oldToken {
		t.Fatal("refresh token was not rotated")
	}
	if !store.tokens[auth.HashRefreshToken(oldToken)].RevokedAt.Valid {
		t.Fatal("old refresh token was not revoked")
	}
	if _, ok := store.tokens[auth.HashRefreshToken(body.RefreshToken)]; !ok {
		t.Fatal("new refresh-token hash was not stored")
	}
}

func TestRefreshReuseRevokesFamily(t *testing.T) {
	const replayedToken = "replayed-refresh-token"
	store := newRefreshStore(replayedToken, true)
	response := performRefresh(t, store, replayedToken)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
	if !store.familyRevoked {
		t.Fatal("replayed token did not revoke its family")
	}
}

func TestRefreshRejectsMissingOrUnknownToken(t *testing.T) {
	tests := []struct {
		name     string
		rawToken string
	}{
		{"missing bearer token", ""},
		{"unknown refresh token", "unknown-refresh-token"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newRefreshStore("stored-refresh-token", false)
			request := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", nil)
			if test.rawToken != "" {
				request.Header.Set("Authorization", "Bearer "+test.rawToken)
			}
			response := httptest.NewRecorder()
			New(db.New(store), nil, testJWTSecret).Refresh(response, request)

			if response.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
			}
		})
	}
}

func TestRefreshRejectsAndRevokesExpiredToken(t *testing.T) {
	const rawToken = "expired-refresh-token"
	store := newRefreshStore(rawToken, false)
	hash := auth.HashRefreshToken(rawToken)
	token := store.tokens[hash]
	token.ExpiresAt = pgtype.Timestamptz{Time: time.Now().UTC().Add(-time.Minute), Valid: true}
	store.tokens[hash] = token

	response := performRefresh(t, store, rawToken)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
	if !store.tokens[hash].RevokedAt.Valid {
		t.Fatal("expired refresh token was not revoked")
	}
}

func TestRefreshHandlesRotationFailures(t *testing.T) {
	tests := []struct {
		name          string
		rotateErr     error
		wantStatus    int
		familyRevoked bool
	}{
		{"rotation race revokes family", pgx.ErrNoRows, http.StatusUnauthorized, true},
		{"database failure", errors.New("database unavailable"), http.StatusInternalServerError, false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			const rawToken = "refresh-token"
			store := newRefreshStore(rawToken, false)
			store.rotateErr = test.rotateErr
			response := performRefresh(t, store, rawToken)

			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}
			if store.familyRevoked != test.familyRevoked {
				t.Fatalf("familyRevoked = %v, want %v", store.familyRevoked, test.familyRevoked)
			}
		})
	}
}

func performRevoke(store *refreshStore, rawToken string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, "/api/auth/revoke", nil)
	if rawToken != "" {
		request.Header.Set("Authorization", "Bearer "+rawToken)
	}
	response := httptest.NewRecorder()
	New(db.New(store), nil, testJWTSecret).Revoke(response, request)
	return response
}

func TestRevoke(t *testing.T) {
	t.Run("revokes an active refresh token", func(t *testing.T) {
		const rawToken = "active-refresh-token"
		store := newRefreshStore(rawToken, false)
		response := performRevoke(store, rawToken)

		if response.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
		}
		if !store.tokens[auth.HashRefreshToken(rawToken)].RevokedAt.Valid {
			t.Fatal("refresh token was not revoked")
		}
	})

	tests := []struct {
		name       string
		rawToken   string
		configure  func(*refreshStore)
		wantStatus int
	}{
		{"requires bearer token", "", nil, http.StatusUnauthorized},
		{"rejects unknown token", "unknown-token", nil, http.StatusUnauthorized},
		{"rejects already revoked token", "stored-token", func(store *refreshStore) {
			hash := auth.HashRefreshToken("stored-token")
			token := store.tokens[hash]
			token.RevokedAt = pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
			store.tokens[hash] = token
		}, http.StatusUnauthorized},
		{"handles persistence failure", "stored-token", func(store *refreshStore) {
			store.revokeErr = errors.New("database unavailable")
		}, http.StatusInternalServerError},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			store := newRefreshStore("stored-token", false)
			if test.configure != nil {
				test.configure(store)
			}
			response := performRevoke(store, test.rawToken)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}
		})
	}
}

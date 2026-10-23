package handlers

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/chesstutis/site/internal/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

type ratingsHandlerStore struct {
	user            db.User
	snapshot        db.ChessComRatingSnapshot
	snapshotMissing bool
}

func (s *ratingsHandlerStore) Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, errors.New("unexpected exec")
}

func (s *ratingsHandlerStore) Query(context.Context, string, ...interface{}) (pgx.Rows, error) {
	return nil, errors.New("unexpected query")
}

func (s *ratingsHandlerStore) QueryRow(_ context.Context, query string, _ ...interface{}) pgx.Row {
	switch {
	case strings.Contains(query, "-- name: GetUserById"):
		return accountRow{user: s.user}
	case strings.Contains(query, "-- name: GetInitialRatingSnapshot"):
		if s.snapshotMissing {
			return ratingSnapshotRow{err: pgx.ErrNoRows}
		}
		return ratingSnapshotRow{snapshot: s.snapshot}
	default:
		return ratingSnapshotRow{err: errors.New("unexpected query row")}
	}
}

type ratingSnapshotRow struct {
	snapshot db.ChessComRatingSnapshot
	err      error
}

func (r ratingSnapshotRow) Scan(dest ...interface{}) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != 9 {
		return errors.New("unexpected scan destination count")
	}
	*dest[0].(*int64) = r.snapshot.ID
	*dest[1].(*int64) = r.snapshot.UserID
	*dest[2].(*pgtype.Timestamptz) = r.snapshot.CapturedAt
	*dest[3].(*pgtype.Int4) = r.snapshot.BulletRating
	*dest[4].(*pgtype.Int4) = r.snapshot.BlitzRating
	*dest[5].(*pgtype.Int4) = r.snapshot.RapidRating
	*dest[6].(*pgtype.Int4) = r.snapshot.DailyRating
	*dest[7].(*pgtype.Text) = r.snapshot.ChessComUsername
	*dest[8].(*pgtype.Int8) = r.snapshot.ChessComPlayerID
	return nil
}

func newRatingsHandler(store *ratingsHandlerStore, statsStatus int) *Handler {
	handler := New(db.New(store), nil, testJWTSecret)
	handler.ChessComClient = accountHTTPDoer(func(request *http.Request) (*http.Response, error) {
		body := `{"player_id":42}`
		status := http.StatusOK
		if strings.HasSuffix(request.URL.Path, "/stats") {
			body = `{"chess_bullet":{"last":{"rating":1210}},"chess_blitz":{"last":{"rating":1310}},"chess_rapid":{"last":{"rating":1410}},"chess_daily":{"last":{"rating":1510}}}`
			status = statsStatus
		}
		return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(body))}, nil
	})
	return handler
}

func TestMyRatings(t *testing.T) {
	now := time.Date(2026, time.January, 1, 0, 0, 0, 0, time.UTC)
	baseStore := func() *ratingsHandlerStore {
		return &ratingsHandlerStore{
			user: db.User{ID: 42, ChessComUsername: "new-name"},
			snapshot: db.ChessComRatingSnapshot{
				ID: 1, UserID: 42,
				CapturedAt:       pgtype.Timestamptz{Time: now, Valid: true},
				BulletRating:     pgtype.Int4{Int32: 1200, Valid: true},
				BlitzRating:      pgtype.Int4{Int32: 1300, Valid: true},
				RapidRating:      pgtype.Int4{Int32: 1400, Valid: true},
				DailyRating:      pgtype.Int4{Int32: 1500, Valid: true},
				ChessComUsername: pgtype.Text{String: "old-name", Valid: true},
				ChessComPlayerID: pgtype.Int8{Int64: 42, Valid: true},
			},
		}
	}

	t.Run("compares ratings for the same Chess.com account after a username change", func(t *testing.T) {
		handler := newRatingsHandler(baseStore(), http.StatusOK)
		response := performProtectedHandlerRequest(t, handler.MyRatings, http.MethodGet, "/api/me/ratings", true)
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusOK, response.Body.String())
		}
		body := response.Body.String()
		for _, expected := range []string{`"comparison_status":"available"`, `"baseline_captured_at":"2026-01-01T00:00:00Z"`, `"bullet":1200`, `"bullet":1210`} {
			if !strings.Contains(body, expected) {
				t.Errorf("response missing %s: %s", expected, body)
			}
		}
	})

	t.Run("hides current ratings for a different Chess.com account", func(t *testing.T) {
		store := baseStore()
		store.snapshot.ChessComPlayerID = pgtype.Int8{Int64: 7, Valid: true}
		response := performProtectedHandlerRequest(t, newRatingsHandler(store, http.StatusOK).MyRatings, http.MethodGet, "/api/me/ratings", true)
		if !strings.Contains(response.Body.String(), `"comparison_status":"account_mismatch"`) || !strings.Contains(response.Body.String(), `"current":{"bullet":null`) {
			t.Fatalf("unexpected mismatch response: %s", response.Body.String())
		}
	})

	t.Run("reports current ratings unavailable without failing the dashboard request", func(t *testing.T) {
		response := performProtectedHandlerRequest(t, newRatingsHandler(baseStore(), http.StatusServiceUnavailable).MyRatings, http.MethodGet, "/api/me/ratings", true)
		if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"comparison_status":"current_unavailable"`) {
			t.Fatalf("status = %d; body = %q", response.Code, response.Body.String())
		}
	})

	t.Run("reports missing baseline", func(t *testing.T) {
		store := baseStore()
		store.snapshotMissing = true
		response := performProtectedHandlerRequest(t, newRatingsHandler(store, http.StatusOK).MyRatings, http.MethodGet, "/api/me/ratings", true)
		if !strings.Contains(response.Body.String(), `"comparison_status":"baseline_unavailable"`) {
			t.Fatalf("unexpected response: %s", response.Body.String())
		}
	})

	t.Run("requires authentication", func(t *testing.T) {
		response := performProtectedHandlerRequest(t, newRatingsHandler(baseStore(), http.StatusOK).MyRatings, http.MethodGet, "/api/me/ratings", false)
		if response.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
		}
	})
}

package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/chesstutis/site/internal/auth"
	"github.com/chesstutis/site/internal/db"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type chessComRatings struct {
	Bullet pgtype.Int4
	Blitz  pgtype.Int4
	Rapid  pgtype.Int4
	Daily  pgtype.Int4
}

type chessComRatingStat struct {
	Last *struct {
		Rating *int32 `json:"rating"`
	} `json:"last"`
}

func parseChessComRatings(reader io.Reader) (chessComRatings, error) {
	var stats struct {
		Bullet *chessComRatingStat `json:"chess_bullet"`
		Blitz  *chessComRatingStat `json:"chess_blitz"`
		Rapid  *chessComRatingStat `json:"chess_rapid"`
		Daily  *chessComRatingStat `json:"chess_daily"`
	}
	if err := json.NewDecoder(reader).Decode(&stats); err != nil {
		return chessComRatings{}, err
	}
	return chessComRatings{
		Bullet: ratingFromStat(stats.Bullet),
		Blitz:  ratingFromStat(stats.Blitz),
		Rapid:  ratingFromStat(stats.Rapid),
		Daily:  ratingFromStat(stats.Daily),
	}, nil
}

func ratingFromStat(stat *chessComRatingStat) pgtype.Int4 {
	if stat == nil || stat.Last == nil || stat.Last.Rating == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: *stat.Last.Rating, Valid: true}
}

func (h *Handler) fetchChessComRatings(ctx context.Context, username string) (chessComRatings, error) {
	requestURL := fmt.Sprintf("%s/%s/stats", h.ChessComBaseURL, url.PathEscape(username))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return chessComRatings{}, fmt.Errorf("build Chess.com stats request: %w", err)
	}
	req.Header.Set("User-Agent", "Chesstutis/1.0 (https://chesstutis.org)")
	response, err := h.ChessComClient.Do(req)
	if err != nil {
		return chessComRatings{}, fmt.Errorf("request Chess.com stats: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return chessComRatings{}, fmt.Errorf("Chess.com stats returned status %d", response.StatusCode)
	}
	return parseChessComRatings(io.LimitReader(response.Body, 1<<20))
}

func sameChessComAccount(currentUsername string, currentPlayerID pgtype.Int8, baselineUsername string, baselinePlayerID pgtype.Int8) bool {
	if currentPlayerID.Valid && baselinePlayerID.Valid {
		return currentPlayerID.Int64 == baselinePlayerID.Int64
	}
	return strings.EqualFold(strings.TrimSpace(currentUsername), strings.TrimSpace(baselineUsername))
}

type ratingValues struct {
	Bullet *int32 `json:"bullet"`
	Blitz  *int32 `json:"blitz"`
	Rapid  *int32 `json:"rapid"`
	Daily  *int32 `json:"daily"`
}

func ratingValuesFromPG(bullet, blitz, rapid, daily pgtype.Int4) ratingValues {
	return ratingValues{
		Bullet: nullableRating(bullet),
		Blitz:  nullableRating(blitz),
		Rapid:  nullableRating(rapid),
		Daily:  nullableRating(daily),
	}
}

func nullableRating(rating pgtype.Int4) *int32 {
	if !rating.Valid {
		return nil
	}
	value := rating.Int32
	return &value
}

type ratingsResponse struct {
	Baseline           ratingValues `json:"baseline"`
	Current            ratingValues `json:"current"`
	BaselineCapturedAt *time.Time   `json:"baseline_captured_at"`
	ComparisonStatus   string       `json:"comparison_status"`
}

func (h *Handler) MyRatings(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		slog.Warn("ratings request missing authenticated user", "request_id", middleware.GetReqID(r.Context()))
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.Queries.GetUserById(r.Context(), userID)
	if err != nil {
		slog.Error("failed to fetch user for ratings", "request_id", middleware.GetReqID(r.Context()), "err", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	snapshot, snapshotErr := h.Queries.GetInitialRatingSnapshot(r.Context(), userID)
	if snapshotErr != nil && snapshotErr != pgx.ErrNoRows {
		slog.Error("failed to fetch rating baseline", "request_id", middleware.GetReqID(r.Context()), "err", snapshotErr)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	response := ratingsResponse{ComparisonStatus: "available"}
	if snapshotErr == nil {
		response.Baseline = ratingValuesFromPG(snapshot.BulletRating, snapshot.BlitzRating, snapshot.RapidRating, snapshot.DailyRating)
		if snapshot.CapturedAt.Valid {
			capturedAt := snapshot.CapturedAt.Time
			response.BaselineCapturedAt = &capturedAt
		}
	}

	_, playerID := h.fetchChessComPlayerID(r.Context(), user.ChessComUsername)
	current, err := h.fetchChessComRatings(r.Context(), user.ChessComUsername)
	if err != nil {
		slog.Warn("failed to fetch current Chess.com ratings", "request_id", middleware.GetReqID(r.Context()), "err", err)
		response.ComparisonStatus = "current_unavailable"
	} else if snapshotErr == pgx.ErrNoRows || !hasRatings(snapshot) {
		response.Current = ratingValuesFromPG(current.Bullet, current.Blitz, current.Rapid, current.Daily)
		response.ComparisonStatus = "baseline_unavailable"
	} else if !sameChessComAccount(user.ChessComUsername, playerID, snapshot.ChessComUsername.String, snapshot.ChessComPlayerID) {
		response.ComparisonStatus = "account_mismatch"
	} else {
		response.Current = ratingValuesFromPG(current.Bullet, current.Blitz, current.Rapid, current.Daily)
	}

	render.JSON(w, r, response)
}

func hasRatings(snapshot db.ChessComRatingSnapshot) bool {
	return snapshot.BulletRating.Valid || snapshot.BlitzRating.Valid || snapshot.RapidRating.Valid || snapshot.DailyRating.Valid
}

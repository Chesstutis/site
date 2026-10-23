package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/go-chi/chi/v5/middleware"
)

const defaultChessComBaseURL = "https://api.chess.com/pub/player"

type httpDoer interface {
	Do(*http.Request) (*http.Response, error)
}

type chessComUsernameStatus int

const (
	chessComUsernameUnavailable chessComUsernameStatus = iota
	chessComUsernameInvalid
	chessComUsernameValid
)

func (h *Handler) validateChessComUsername(ctx context.Context, username string) chessComUsernameStatus {
	status, _ := h.fetchChessComPlayerID(ctx, username)
	return status
}

func (h *Handler) fetchChessComPlayerID(ctx context.Context, username string) (chessComUsernameStatus, pgtype.Int8) {
	requestURL := fmt.Sprintf("%s/%s", h.ChessComBaseURL, url.PathEscape(username))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		slog.Error("failed to build Chess.com username request", "request_id", middleware.GetReqID(ctx), "err", err)
		return chessComUsernameUnavailable, pgtype.Int8{}
	}
	req.Header.Set("User-Agent", "Chesstutis/1.0 (https://chesstutis.org)")

	response, err := h.ChessComClient.Do(req)
	if err != nil {
		slog.Error("failed to verify Chess.com username", "request_id", middleware.GetReqID(ctx), "err", err)
		return chessComUsernameUnavailable, pgtype.Int8{}
	}
	defer response.Body.Close()

	switch response.StatusCode {
	case http.StatusOK:
		var profile struct {
			PlayerID int64 `json:"player_id"`
		}
		if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&profile); err == nil && profile.PlayerID > 0 {
			return chessComUsernameValid, pgtype.Int8{Int64: profile.PlayerID, Valid: true}
		}
		return chessComUsernameValid, pgtype.Int8{}
	case http.StatusNotFound, http.StatusGone:
		return chessComUsernameInvalid, pgtype.Int8{}
	default:
		slog.Warn(
			"Chess.com username verification returned an unexpected status",
			"request_id", middleware.GetReqID(ctx),
			"status", response.StatusCode,
		)
		return chessComUsernameUnavailable, pgtype.Int8{}
	}
}

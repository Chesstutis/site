package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"

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
	requestURL := fmt.Sprintf("%s/%s", h.ChessComBaseURL, url.PathEscape(username))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		slog.Error("failed to build Chess.com username request", "request_id", middleware.GetReqID(ctx), "err", err)
		return chessComUsernameUnavailable
	}
	req.Header.Set("User-Agent", "Chesstutis/1.0 (https://chesstutis.org)")

	response, err := h.ChessComClient.Do(req)
	if err != nil {
		slog.Error("failed to verify Chess.com username", "request_id", middleware.GetReqID(ctx), "err", err)
		return chessComUsernameUnavailable
	}
	defer response.Body.Close()

	switch response.StatusCode {
	case http.StatusOK:
		return chessComUsernameValid
	case http.StatusNotFound, http.StatusGone:
		return chessComUsernameInvalid
	default:
		slog.Warn(
			"Chess.com username verification returned an unexpected status",
			"request_id", middleware.GetReqID(ctx),
			"status", response.StatusCode,
		)
		return chessComUsernameUnavailable
	}
}

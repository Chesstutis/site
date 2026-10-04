package handlers

import (
	"context"
	"errors"
	"net/http"
	"testing"
)

func TestValidateChessComUsername(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		err        error
		want       chessComUsernameStatus
	}{
		{"accepts existing username", http.StatusOK, nil, chessComUsernameValid},
		{"rejects missing username", http.StatusNotFound, nil, chessComUsernameInvalid},
		{"rejects removed username", http.StatusGone, nil, chessComUsernameInvalid},
		{"treats throttling as unavailable", http.StatusTooManyRequests, nil, chessComUsernameUnavailable},
		{"treats network failure as unavailable", 0, errors.New("network unavailable"), chessComUsernameUnavailable},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			handler := &Handler{
				ChessComBaseURL: defaultChessComBaseURL,
				ChessComClient: accountHTTPDoer(func(*http.Request) (*http.Response, error) {
					if test.err != nil {
						return nil, test.err
					}
					return &http.Response{StatusCode: test.statusCode, Body: http.NoBody}, nil
				}),
			}

			if got := handler.validateChessComUsername(context.Background(), "player-1"); got != test.want {
				t.Fatalf("status = %v, want %v", got, test.want)
			}
		})
	}
}

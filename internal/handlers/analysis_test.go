package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/chesstutis/analyzer"
	"github.com/corentings/chess/v2"
)

type fakeGameAnalyzer struct {
	analysis *analyzer.GameAnalysis
	err      error
	colors   []chess.Color
}

func (a *fakeGameAnalyzer) AnalyzeGame(_ *chess.Game, color chess.Color) (*analyzer.GameAnalysis, error) {
	a.colors = append(a.colors, color)
	if a.err != nil {
		return nil, a.err
	}
	return a.analysis, nil
}

func performAnalysisRequest(t *testing.T, handler *Handler, body interface{}) *httptest.ResponseRecorder {
	t.Helper()

	encoded, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("encode request: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/analyze", bytes.NewReader(encoded))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	handler.AnalyzeGames(response, request)
	return response
}

func analysisGame(white, black, pgn string) map[string]interface{} {
	return map[string]interface{}{
		"pgn": pgn,
		"white": map[string]interface{}{
			"username": white,
		},
		"black": map[string]interface{}{
			"username": black,
		},
	}
}

func TestPingHandler(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/ping", nil)
	response := httptest.NewRecorder()
	new(Handler).PingHandler(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if response.Body.String() != "pong" {
		t.Fatalf("body = %q, want %q", response.Body.String(), "pong")
	}
}

func TestAnalyzeGames(t *testing.T) {
	t.Run("returns puzzles and detects player color case-insensitively", func(t *testing.T) {
		position := chess.NewGame().Position()
		uci := chess.UCINotation{}
		playerMove, err := uci.Decode(position, "e2e4")
		if err != nil {
			t.Fatalf("decode player move: %v", err)
		}
		bestMove, err := uci.Decode(position, "d2d4")
		if err != nil {
			t.Fatalf("decode best move: %v", err)
		}

		fake := &fakeGameAnalyzer{analysis: &analyzer.GameAnalysis{Puzzles: []analyzer.Puzzle{{
			Position:   position,
			PlayerMove: playerMove,
			BestMove:   bestMove,
		}}}}
		handler := &Handler{Analyzer: fake}
		response := performAnalysisRequest(t, handler, map[string]interface{}{
			"username": "TARGET",
			"games": []interface{}{
				analysisGame("target", "opponent", "1. e4 e5 *"),
				analysisGame("opponent", "Target", "1. d4 d5 *"),
			},
		})

		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body = %q", response.Code, http.StatusOK, response.Body.String())
		}
		if len(fake.colors) != 2 || fake.colors[0] != chess.White || fake.colors[1] != chess.Black {
			t.Fatalf("analyzed colors = %v, want [white black]", fake.colors)
		}
		var body []struct {
			Fen        string `json:"fen"`
			BestMove   string `json:"best_move"`
			PlayerMove string `json:"player_move"`
		}
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatalf("decode response: %v", err)
		}
		if len(body) != 2 {
			t.Fatalf("puzzle count = %d, want 2", len(body))
		}
		for _, puzzle := range body {
			if puzzle.Fen != position.String() || puzzle.BestMove != "d2d4" || puzzle.PlayerMove != "e2e4" {
				t.Fatalf("unexpected puzzle response: %+v", puzzle)
			}
		}
	})

	t.Run("rejects malformed JSON", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodPost, "/api/analyze", bytes.NewBufferString("{"))
		response := httptest.NewRecorder()
		new(Handler).AnalyzeGames(response, request)
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
	})

	t.Run("rejects invalid PGN", func(t *testing.T) {
		fake := &fakeGameAnalyzer{}
		response := performAnalysisRequest(t, &Handler{Analyzer: fake}, map[string]interface{}{
			"username": "target",
			"games":    []interface{}{analysisGame("target", "opponent", "[Event")},
		})
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
		if len(fake.colors) != 0 {
			t.Fatal("analyzer was called for invalid PGN")
		}
	})

	t.Run("rejects game that does not contain requested player", func(t *testing.T) {
		fake := &fakeGameAnalyzer{}
		response := performAnalysisRequest(t, &Handler{Analyzer: fake}, map[string]interface{}{
			"username": "target",
			"games":    []interface{}{analysisGame("white", "black", "1. e4 e5 *")},
		})
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
		if len(fake.colors) != 0 {
			t.Fatal("analyzer was called for unrelated player")
		}
	})

	t.Run("maps analyzer failure to bad request", func(t *testing.T) {
		fake := &fakeGameAnalyzer{err: errors.New("analysis failed")}
		response := performAnalysisRequest(t, &Handler{Analyzer: fake}, map[string]interface{}{
			"username": "target",
			"games":    []interface{}{analysisGame("target", "opponent", "1. e4 e5 *")},
		})
		if response.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
		}
		if len(fake.colors) != 1 || fake.colors[0] != chess.White {
			t.Fatalf("analyzed colors = %v, want [white]", fake.colors)
		}
	})
}

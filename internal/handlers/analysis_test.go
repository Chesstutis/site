package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/chesstutis/analyzer"
	"github.com/chesstutis/site/internal/auth"
	"github.com/chesstutis/site/internal/config"
	"github.com/chesstutis/site/internal/db"
	"github.com/corentings/chess/v2"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
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

type storedPuzzle struct {
	id     int64
	userID int64
	uuid   string
	data   []byte
	solved bool
}
type analysisStore struct {
	games   map[string]bool
	puzzles []storedPuzzle
}

func newAnalysisStore() *analysisStore { return &analysisStore{games: make(map[string]bool)} }
func (s *analysisStore) Exec(_ context.Context, query string, args ...interface{}) (pgconn.CommandTag, error) {
	if strings.Contains(query, "-- name: MarkPuzzleSolved") {
		id, userID := args[0].(int64), args[1].(int64)
		for i := range s.puzzles {
			if s.puzzles[i].id == id && s.puzzles[i].userID == userID && !s.puzzles[i].solved {
				s.puzzles[i].solved = true
				return pgconn.NewCommandTag("UPDATE 1"), nil
			}
		}
		return pgconn.NewCommandTag("UPDATE 0"), nil
	}
	return pgconn.CommandTag{}, fmt.Errorf("unexpected exec: %s", query)
}
func (s *analysisStore) Query(_ context.Context, query string, args ...interface{}) (pgx.Rows, error) {
	if strings.Contains(query, "-- name: GetUnsolvedPuzzles") {
		userID := args[0].(int64)
		rows := &analysisRows{}
		for _, p := range s.puzzles {
			if p.userID == userID && !p.solved {
				rows.values = append(rows.values, []any{p.id, p.data})
			}
		}
		return rows, nil
	}
	return nil, fmt.Errorf("unexpected query: %s", query)
}
func (s *analysisStore) QueryRow(_ context.Context, query string, args ...interface{}) pgx.Row {
	switch {
	case strings.Contains(query, "-- name: IsGameAnalyzed"):
		return valueRow{values: []any{s.games[fmt.Sprintf("%d:%s", args[0].(int64), args[1].(pgtype.UUID).String())]}}
	case strings.Contains(query, "-- name: SaveAnalyzedGame"):
		userID, gameUUID := args[0].(int64), args[1].(pgtype.UUID).String()
		key := fmt.Sprintf("%d:%s", userID, gameUUID)
		if s.games[key] {
			return valueRow{values: []any{false}}
		}
		s.games[key] = true
		var puzzles []json.RawMessage
		_ = json.Unmarshal(args[2].([]byte), &puzzles)
		for _, puzzle := range puzzles {
			s.puzzles = append(s.puzzles, storedPuzzle{id: int64(len(s.puzzles) + 1), userID: userID, uuid: gameUUID, data: puzzle})
		}
		return valueRow{values: []any{true}}
	case strings.Contains(query, "-- name: GetPuzzleForAttempt"):
		id, userID := args[0].(int64), args[1].(int64)
		for _, p := range s.puzzles {
			if p.id == id && p.userID == userID {
				return valueRow{values: []any{p.data}}
			}
		}
		return valueRow{err: pgx.ErrNoRows}
	default:
		return valueRow{err: fmt.Errorf("unexpected query row: %s", query)}
	}
}

type valueRow struct {
	values []any
	err    error
}

func (r valueRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != len(r.values) {
		return fmt.Errorf("scan destinations %d != values %d", len(dest), len(r.values))
	}
	for i, value := range r.values {
		switch d := dest[i].(type) {
		case *bool:
			*d = value.(bool)
		case *[]byte:
			*d = value.([]byte)
		default:
			return fmt.Errorf("unsupported scan destination %T", dest[i])
		}
	}
	return nil
}

type analysisRows struct {
	values [][]any
	index  int
}

func (r *analysisRows) Close()                                       {}
func (r *analysisRows) Err() error                                   { return nil }
func (r *analysisRows) CommandTag() pgconn.CommandTag                { return pgconn.CommandTag{} }
func (r *analysisRows) FieldDescriptions() []pgconn.FieldDescription { return nil }
func (r *analysisRows) Next() bool {
	if r.index >= len(r.values) {
		return false
	}
	r.index++
	return true
}
func (r *analysisRows) Scan(dest ...any) error {
	row := r.values[r.index-1]
	*dest[0].(*int64) = row[0].(int64)
	*dest[1].(*[]byte) = row[1].([]byte)
	return nil
}
func (r *analysisRows) Values() ([]any, error) { return r.values[r.index-1], nil }
func (r *analysisRows) RawValues() [][]byte    { return nil }
func (r *analysisRows) Conn() *pgx.Conn        { return nil }

func performAnalysisRequest(t *testing.T, handler *Handler, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	encoded, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/analyze", bytes.NewReader(encoded))
	request.Header.Set("Content-Type", "application/json")
	token, err := auth.MakeJWT(42, testJWTSecret, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()
	auth.RequireAuth(testJWTSecret)(http.HandlerFunc(handler.AnalyzeGames)).ServeHTTP(response, request)
	return response
}

func analysisGame(uuid, white, black, pgn string) map[string]interface{} {
	return map[string]interface{}{"uuid": uuid, "pgn": pgn, "rules": "chess", "rated": true, "white": map[string]interface{}{"username": white}, "black": map[string]interface{}{"username": black}}
}

func TestAnalyzeGamesPersistsAndDoesNotExposeSolution(t *testing.T) {
	position := chess.NewGame().Position()
	uci := chess.UCINotation{}
	playerMove, _ := uci.Decode(position, "e2e4")
	bestMove, _ := uci.Decode(position, "d2d4")
	fake := &fakeGameAnalyzer{analysis: &analyzer.GameAnalysis{Puzzles: []analyzer.Puzzle{{Position: position, PlayerMove: playerMove, BestMove: bestMove}}}}
	store := newAnalysisStore()
	handler := &Handler{Queries: db.New(store), Analyzer: fake, JWT_SECRET: testJWTSecret}
	body := map[string]interface{}{"username": "TARGET", "games": []interface{}{analysisGame("00000000-0000-0000-0000-000000000001", "target", "opponent", "1. e4 e5 *")}}
	response := performAnalysisRequest(t, handler, body)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body=%q", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), "best_move") || strings.Contains(response.Body.String(), "d2d4") {
		t.Fatalf("solution leaked: %s", response.Body.String())
	}
	var puzzles []struct {
		ID         int64  `json:"id"`
		Fen        string `json:"fen"`
		PlayerMove string `json:"player_move"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &puzzles); err != nil {
		t.Fatal(err)
	}
	if len(puzzles) != 1 || puzzles[0].ID != 1 || puzzles[0].Fen != position.String() || puzzles[0].PlayerMove != "e2e4" {
		t.Fatalf("unexpected response: %+v", puzzles)
	}
	response = performAnalysisRequest(t, handler, body)
	if response.Code != http.StatusOK || len(fake.colors) != 1 {
		t.Fatalf("repeat reanalyzed game: status=%d analyses=%d", response.Code, len(fake.colors))
	}
}

func TestAnalyzeGamesAcceptsConfiguredLimitAndRejectsLarger(t *testing.T) {
	games := make([]interface{}, config.MaxAnalysisGames)
	for i := range games {
		games[i] = analysisGame(fmt.Sprintf("00000000-0000-0000-0000-%012d", i+1), "target", "opponent", "1. e4 e5 *")
	}
	fake := &fakeGameAnalyzer{analysis: &analyzer.GameAnalysis{}}
	store := newAnalysisStore()
	handler := &Handler{Queries: db.New(store), Analyzer: fake, JWT_SECRET: testJWTSecret}
	response := performAnalysisRequest(t, handler, map[string]interface{}{"username": "target", "games": games})
	if response.Code != http.StatusOK || len(fake.colors) != config.MaxAnalysisGames {
		t.Fatalf("limit request: status=%d analyses=%d", response.Code, len(fake.colors))
	}
	games = append(games, analysisGame("00000000-0000-0000-0000-999999999999", "target", "opponent", "1. e4 e5 *"))
	fake.colors = nil
	response = performAnalysisRequest(t, handler, map[string]interface{}{"username": "target", "games": games})
	if response.Code != http.StatusBadRequest || len(fake.colors) != 0 {
		t.Fatalf("oversized request: status=%d analyses=%d", response.Code, len(fake.colors))
	}
}

func TestAnalyzeGamesKeepsSolvedPuzzlesOutOfResponse(t *testing.T) {
	const gameUUID = "00000000-0000-0000-0000-000000000042"
	store := newAnalysisStore()
	store.games["42:"+gameUUID] = true
	store.puzzles = []storedPuzzle{{
		id: 9, userID: 42, uuid: gameUUID,
		data: []byte(`{"fen":"fen","best_move":"d2d4","player_move":"e2e4"}`), solved: true,
	}}
	handler := &Handler{Queries: db.New(store), Analyzer: &fakeGameAnalyzer{}}
	response := performAnalysisRequest(t, handler, map[string]interface{}{
		"username": "target",
		"games":    []interface{}{analysisGame(gameUUID, "target", "opponent", "not parsed because already analyzed")},
	})
	if response.Code != http.StatusOK || response.Body.String() != "[]\n" {
		t.Fatalf("solved puzzle response status=%d body=%q", response.Code, response.Body.String())
	}
}

func TestAttemptPuzzleValidatesOwnershipAndMarksSolved(t *testing.T) {
	store := newAnalysisStore()
	store.puzzles = []storedPuzzle{{id: 8, userID: 42, data: []byte(`{"fen":"fen","best_move":"d2d4"}`)}}
	handler := New(db.New(store), nil, testJWTSecret)
	attempt := func(userID int64, move string) *httptest.ResponseRecorder {
		payload, _ := json.Marshal(map[string]string{"move": move})
		request := httptest.NewRequest(http.MethodPost, "/api/me/puzzles/8/attempts", bytes.NewReader(payload))
		token, _ := auth.MakeJWT(userID, testJWTSecret, time.Hour)
		request.Header.Set("Authorization", "Bearer "+token)
		response := httptest.NewRecorder()
		router := chi.NewRouter()
		router.With(func(next http.Handler) http.Handler { return auth.RequireAuth(testJWTSecret)(next) }).Post("/api/me/puzzles/{puzzleID}/attempts", handler.AttemptPuzzle)
		router.ServeHTTP(response, request)
		return response
	}
	if response := attempt(42, "e2e4"); response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"correct":false`) || store.puzzles[0].solved {
		t.Fatalf("incorrect attempt response=%d %s", response.Code, response.Body.String())
	}
	if response := attempt(43, "d2d4"); response.Code != http.StatusNotFound {
		t.Fatalf("cross-user status=%d", response.Code)
	}
	if response := attempt(42, "d2d4"); response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"correct":true`) || !store.puzzles[0].solved {
		t.Fatalf("correct attempt response=%d %s", response.Code, response.Body.String())
	}
}

func TestAttemptPuzzleRejectsMalformedMove(t *testing.T) {
	store := newAnalysisStore()
	handler := New(db.New(store), nil, testJWTSecret)
	request := httptest.NewRequest(http.MethodPost, "/api/me/puzzles/1/attempts", strings.NewReader(`{"move":"secret"}`))
	token, _ := auth.MakeJWT(42, testJWTSecret, time.Hour)
	request.Header.Set("Authorization", "Bearer "+token)
	response := httptest.NewRecorder()
	router := chi.NewRouter()
	router.With(func(next http.Handler) http.Handler { return auth.RequireAuth(testJWTSecret)(next) }).Post("/api/me/puzzles/{puzzleID}/attempts", handler.AttemptPuzzle)
	router.ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", response.Code)
	}
}

func TestPuzzleHintReturnsProgressiveSquaresForOwner(t *testing.T) {
	store := newAnalysisStore()
	store.puzzles = []storedPuzzle{{id: 8, userID: 42, data: []byte(`{"fen":"fen","best_move":"d2d4"}`)}}
	handler := &Handler{Queries: db.New(store)}
	requestHint := func(userID int64, level int) *httptest.ResponseRecorder {
		payload, _ := json.Marshal(map[string]int{"level": level})
		request := httptest.NewRequest(http.MethodPost, "/api/me/puzzles/8/hints", bytes.NewReader(payload))
		token, _ := auth.MakeJWT(userID, testJWTSecret, time.Hour)
		request.Header.Set("Authorization", "Bearer "+token)
		response := httptest.NewRecorder()
		router := chi.NewRouter()
		router.With(func(next http.Handler) http.Handler { return auth.RequireAuth(testJWTSecret)(next) }).Post("/api/me/puzzles/{puzzleID}/hints", handler.PuzzleHint)
		router.ServeHTTP(response, request)
		return response
	}
	first := requestHint(42, 1)
	if first.Code != http.StatusOK || first.Body.String() != `{"from":"d2"}`+"\n" {
		t.Fatalf("level one response=%d %s", first.Code, first.Body.String())
	}
	second := requestHint(42, 2)
	if second.Code != http.StatusOK || second.Body.String() != `{"from":"d2","to":"d4"}`+"\n" {
		t.Fatalf("level two response=%d %s", second.Code, second.Body.String())
	}
	if response := requestHint(43, 2); response.Code != http.StatusNotFound {
		t.Fatalf("cross-user hint status=%d", response.Code)
	}
	if response := requestHint(42, 3); response.Code != http.StatusBadRequest {
		t.Fatalf("invalid hint level status=%d", response.Code)
	}
}

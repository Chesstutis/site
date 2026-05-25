package handlers

import (
	"encoding/json"
	// "log"
	"net/http"
	"strings"

	"github.com/chesstutis/analyzer"
	"github.com/chesstutis/site/db"
	"github.com/corentings/chess/v2"

	"github.com/go-chi/render"
)

type Handler struct {
	DB       *db.DB
	Analyzer *analyzer.Analyzer
}

func New(dbpool *db.DB, analyzer *analyzer.Analyzer) *Handler {
	return &Handler{
		DB:       dbpool,
		Analyzer: analyzer,
	}
}

func (h *Handler) PingHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("pong"))
}

type ChessPlayer struct {
	Rating   uint16 `json:"rating"`
	Result   string `json:"result"`
	Username string `json:"username"`
}

type ChessGame struct {
	Pgn         string      `json:"pgn"`
	Rules       string      `json:"rules"`
	WhitePlayer ChessPlayer `json:"white"`
	BlackPlayer ChessPlayer `json:"black"`
}

type GamesList struct {
	Games []ChessGame `json:"games"`
}

func (h *Handler) AnalyzeGames(w http.ResponseWriter, r *http.Request) {
	var games GamesList

	err := json.NewDecoder(r.Body).Decode(&games)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	pgn, err := chess.PGN(strings.NewReader(games.Games[1].Pgn))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	game := chess.NewGame(pgn)

	gameAnalysis, err := h.Analyzer.AnalyzeGame(game)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	type PuzzleResponse struct {
		Fen        string `json:"fen"`
		BestMove   string `json:"best_move"`
		PlayerMove string `json:"player_move"`
	}

	uci := chess.UCINotation{}

	puzzleResponses := make([]PuzzleResponse, len(gameAnalysis.Puzzles))
	for i, p := range gameAnalysis.Puzzles {
		puzzleResponses[i] = PuzzleResponse{
			Fen:        p.Position.String(),
			BestMove:   uci.Encode(p.Position, p.BestMove),
			PlayerMove: uci.Encode(p.Position, p.PlayerMove),
		}
	}
	render.JSON(w, r, puzzleResponses)

	// log.Println(gameAnalysis.Puzzles)
	// render.JSON(w, r, gameAnalysis.Puzzles)
}

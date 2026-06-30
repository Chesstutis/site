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
	Games    []ChessGame `json:"games"`
	Username string      `json:"username"`
}

func (h *Handler) AnalyzeGames(w http.ResponseWriter, r *http.Request) {
	var rawGames GamesList

	err := json.NewDecoder(r.Body).Decode(&rawGames)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var games []*chess.Game
	for _, rawGamePGN := range rawGames.Games {
		pgn, err := chess.PGN(strings.NewReader(rawGamePGN.Pgn))
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		games = append(games, chess.NewGame(pgn))
	}

	var analyzedGames []analyzer.GameAnalysis
	for i, game := range games {
		var p chess.Color
		if strings.EqualFold(rawGames.Games[i].WhitePlayer.Username, rawGames.Username) {
			p = chess.White
		} else if strings.EqualFold(rawGames.Games[i].BlackPlayer.Username, rawGames.Username) {
			p = chess.Black
		} else {
			p = chess.NoColor
		}

		gameAnalysis, err := h.Analyzer.AnalyzeGame(game, p)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		analyzedGames = append(analyzedGames, *gameAnalysis)
	}

	type PuzzleResponse struct {
		Fen        string `json:"fen"`
		BestMove   string `json:"best_move"`
		PlayerMove string `json:"player_move"`
	}

	uci := chess.UCINotation{}

	var puzzleResponses []PuzzleResponse
	for _, gameAnalysis := range analyzedGames {
		for _, p := range gameAnalysis.Puzzles {
			puzzleResponses = append(puzzleResponses, PuzzleResponse{
				Fen:        p.Position.String(),
				BestMove:   uci.Encode(p.Position, p.BestMove),
				PlayerMove: uci.Encode(p.Position, p.PlayerMove),
			})
		}
	}
	render.JSON(w, r, puzzleResponses)

	// log.Println(gameAnalysis.Puzzles)
	// render.JSON(w, r, gameAnalysis.Puzzles)
}

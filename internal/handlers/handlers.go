package handlers

import (
	"net/http"
	"strings"

	"github.com/chesstutis/analyzer"
	"github.com/chesstutis/site/internal/db"
	"github.com/chesstutis/site/internal/requests"
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

func (h *Handler) AnalyzeGames(w http.ResponseWriter, r *http.Request) {
	rawGames, err := requests.ParseAnalysisRequest(r.Body) 
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var parsedGames []*chess.Game
	for _, rawGamePGN := range rawGames.Games {
		pgn, err := chess.PGN(strings.NewReader(rawGamePGN.Pgn))
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		parsedGames = append(parsedGames, chess.NewGame(pgn))
	}

	// TODO: this section should get replaced with pushing the games to PQueue to be analyzed and waiting for the result
	//! also i should probably do the username parsing first and package that in the struct...
	var analyzedGames []analyzer.GameAnalysis
	for i, game := range parsedGames {
		var p chess.Color
		if strings.EqualFold(rawGames.Games[i].WhitePlayer.Username, rawGames.Username) {
			p = chess.White
		} else if strings.EqualFold(rawGames.Games[i].BlackPlayer.Username, rawGames.Username) {
			p = chess.Black
		} else {
			// p = chess.NoColor
			http.Error(w, "invalid username", http.StatusBadRequest)
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
}
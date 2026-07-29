package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/chesstutis/analyzer"
	"github.com/chesstutis/site/internal/auth"
	"github.com/chesstutis/site/internal/db"
	"github.com/chesstutis/site/internal/requests"
	"github.com/corentings/chess/v2"

	"github.com/go-chi/render"
)

type Handler struct {
	Queries  *db.Queries
	Analyzer *analyzer.Analyzer
}

func New(dbpool *db.Queries, analyzer *analyzer.Analyzer) *Handler {
	return &Handler{
		Queries:  dbpool,
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
		var playerColor chess.Color
		if strings.EqualFold(rawGames.Games[i].WhitePlayer.Username, rawGames.Username) {
			playerColor = chess.White
		} else if strings.EqualFold(rawGames.Games[i].BlackPlayer.Username, rawGames.Username) {
			playerColor = chess.Black
		} else {
			// p = chess.NoColor
			http.Error(w, "invalid username", http.StatusBadRequest)
		}

		gameAnalysis, err := h.Analyzer.AnalyzeGame(game, playerColor)
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

// func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
// 	rawGames, err := requests.ParseAnalysisRequest(r.Body)
// }

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var loginInfo requests.LoginReq

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&loginInfo); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	userInfo, err := h.Queries.GetUserByEmail(r.Context(), loginInfo.Email)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	validPassword, err := auth.CheckPasswordHash(loginInfo.Password, userInfo.PasswordHash)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !validPassword {
		http.Error(w, "password incorrect", http.StatusUnauthorized)
		return
	}

	data, err := json.Marshal(userInfo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
// 	rawGames, err := requests.ParseAnalysisRequest(r.Body)
// }

package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/chesstutis/analyzer"
	"github.com/chesstutis/site/internal/auth"
	"github.com/chesstutis/site/internal/db"
	"github.com/chesstutis/site/internal/requests"
	"github.com/corentings/chess/v2"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"
)

type Handler struct {
	Queries    *db.Queries
	Analyzer   *analyzer.Analyzer
	JWT_SECRET string
}

func New(dbpool *db.Queries, analyzer *analyzer.Analyzer, JWTSecret string) *Handler {
	return &Handler{
		Queries:    dbpool,
		Analyzer:   analyzer,
		JWT_SECRET: JWTSecret,
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
			slog.Error("analysis failed, chess.NoColor")
			http.Error(w, "unable to analyze game", http.StatusBadRequest)
			return
		}

		gameAnalysis, err := h.Analyzer.AnalyzeGame(game, playerColor)
		if err != nil {
			slog.Error("analysis failed", "err", err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
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

func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var req requests.SignupReq

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		slog.Error(
			"failed to parse request body",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	//TODO maybe should add some regex and chess.com validation
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.ChessComUsername = strings.TrimSpace(req.ChessComUsername)

	if req.Email == "" ||
		req.Password == "" ||
		req.ChessComUsername == "" {
		slog.Error(
			"some fields missing in request",
			"request_id", middleware.GetReqID(r.Context()),
		)
		http.Error(w, "all fields are required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 8 {
		http.Error(w, "password must contain at least 8 characters", http.StatusBadRequest)
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		slog.Error(
			"failed to create user",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "error creating user", http.StatusInternalServerError)
		return
	}

	user, err := h.Queries.CreateUser(r.Context(), db.CreateUserParams{
		Email:            req.Email,
		PasswordHash:     passwordHash,
		ChessComUsername: req.ChessComUsername,
	})

	if err != nil {
		var pgErr *pgconn.PgError

		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			slog.Error(
				"account with email already exists",
				"request_id", middleware.GetReqID(r.Context()),
				"err", err,
			)
			http.Error(w, "error creating user", http.StatusConflict)
			return
		}
		slog.Error(
			"error fetching from database",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "error creating user", http.StatusInternalServerError)
		return
	}

	token, err := auth.MakeJWT(user.ID, h.JWT_SECRET, time.Hour*24)
	if err != nil {
		slog.Error(
			"error creating token",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	rawToken, err := auth.MakeRefreshToken()
	if err != nil {
		slog.Error(
			"error generating refresh token",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	tokenHash := auth.HashRefreshToken(rawToken)

	expiresAt := time.Now().UTC().Add(time.Hour * 24 * 60)
	_, err = h.Queries.CreateRefreshToken(r.Context(), db.CreateRefreshTokenParams{
		TokenHash:  tokenHash,
		UserID: user.ID,
		ExpiresAt: pgtype.Timestamptz{
			Time:  expiresAt,
			Valid: true,
		},
	})

	if err != nil {
		slog.Error(
			"error storing refresh token",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	response := AuthResponse{
		ID:               user.ID,
		Email:            user.Email,
		ChessComUsername: user.ChessComUsername,
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        user.UpdatedAt,
		Token:            token,
		RefreshToken:     rawToken,
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, response)
}

type AuthResponse struct {
	ID               int64              `json:"id"`
	Email            string             `json:"email"`
	ChessComUsername string             `json:"chess_com_username"`
	CreatedAt        pgtype.Timestamptz `json:"created_at"`
	UpdatedAt        pgtype.Timestamptz `json:"updated_at"`
	Token            string             `json:"token"`
	RefreshToken     string             `json:"refresh_token"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var loginInfo requests.LoginReq

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&loginInfo); err != nil {
		slog.Error(
			"error parsing request",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "error parsing request", http.StatusBadRequest)
		return
	}
	userInfo, err := h.Queries.GetUserByEmail(r.Context(), loginInfo.Email)
	if err != nil {
		slog.Error(
			"error fetching from database",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "error logging in", http.StatusBadRequest)
		return
	}

	validPassword, err := auth.CheckPasswordHash(loginInfo.Password, userInfo.PasswordHash)
	if err != nil {
		slog.Error(
			"error checking password hash",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if !validPassword {
		slog.Error(
			"incorrect password",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	jwt, err := auth.MakeJWT(userInfo.ID, h.JWT_SECRET, time.Hour)
	if err != nil {
		slog.Error(
			"error generating JWT",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	rawToken, err := auth.MakeRefreshToken()
	if err != nil {
		slog.Error(
			"error generating refresh token",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	tokenHash := auth.HashRefreshToken(rawToken)

	expiresAt := time.Now().UTC().Add(time.Hour * 24 * 60)
	_, err = h.Queries.CreateRefreshToken(r.Context(), db.CreateRefreshTokenParams{
		TokenHash:  tokenHash,
		UserID: userInfo.ID,
		ExpiresAt: pgtype.Timestamptz{
			Time:  expiresAt,
			Valid: true,
		},
	})

	if err != nil {
		slog.Error(
			"error storing refresh token",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	resp := AuthResponse{
		ID:               userInfo.ID,
		Email:            userInfo.Email,
		ChessComUsername: userInfo.ChessComUsername,
		CreatedAt:        userInfo.CreatedAt,
		UpdatedAt:        userInfo.UpdatedAt,
		Token:            jwt,
		RefreshToken:     rawToken,
	}

	data, err := json.Marshal(resp)
	if err != nil {
		slog.Error(
			"error marshalling response",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

type Me struct {
	ID               int64              `json:"id"`
	Email            string             `json:"email"`
	ChessComUsername string             `json:"chess_com_username"`
	CreatedAt        pgtype.Timestamptz `json:"created_at"`
	UpdatedAt        pgtype.Timestamptz `json:"updated_at"`
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userId, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "error getting user info", http.StatusBadRequest)
		return
	}

	userInfo, err := h.Queries.GetUserById(r.Context(), userId)
	if err != nil {
		http.Error(w, "error getting user info", http.StatusInternalServerError)
		return
	}

	me := Me{
		ID:               userInfo.ID,
		Email:            userInfo.Email,
		ChessComUsername: userInfo.ChessComUsername,
		CreatedAt:        userInfo.CreatedAt,
		UpdatedAt:        userInfo.UpdatedAt,
	}

	data, err := json.Marshal(me)
	if err != nil {
		slog.Error(
			"error marshalling response",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (h *Handler) PuzzleStats(w http.ResponseWriter, r *http.Request) {
	userId, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "error getting user info", http.StatusBadRequest)
		return
	}

	puzzleStats, err := h.Queries.GetPuzzleStats(r.Context(), userId)
	if err != nil {
		slog.Error(
			"error fetching from database",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	data, err := json.Marshal(puzzleStats)
	if err != nil {
		slog.Error(
			"error marshalling response",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	tok, err := auth.GetBearerToken(r.Header)
	if err != nil {
		slog.Error(
			"error getting refresh token from header",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	tokHash := auth.HashRefreshToken(tok)

	tokInfo, err := h.Queries.GetRefreshToken(r.Context(), tokHash)
	if err != nil {
		slog.Error(
			"error getting refresh token from database",
			"err", err,
		)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	now := time.Now().UTC()

	if tokInfo.RevokedAt.Valid {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if !now.Before(tokInfo.ExpiresAt.Time) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	type RefreshResponse struct {
		AccessToken string `json:"token"`
	}

	accessToken, err := auth.MakeJWT(
		tokInfo.UserID,
		h.JWT_SECRET,
		time.Hour,
	)
	if err != nil {
		slog.Error(
			"error generating access token",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	render.Status(r, http.StatusOK)
	render.JSON(w, r, RefreshResponse{
		AccessToken: accessToken,
	})
}

func (h *Handler) Revoke(w http.ResponseWriter, r *http.Request) {
	tok, err := auth.GetBearerToken(r.Header)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	tokHash := auth.HashRefreshToken(tok)

	rowsAffected, err := h.Queries.RevokeRefreshToken(r.Context(), tokHash)
	if err != nil {
		slog.Error(
			"error revoking refresh token in database",
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if rowsAffected == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
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
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/render"
)

type Handler struct {
	Queries         *db.Queries
	Analyzer        gameAnalyzer
	JWT_SECRET      string
	ChessComClient  httpDoer
	ChessComBaseURL string
}

type gameAnalyzer interface {
	AnalyzeGame(*chess.Game, chess.Color) (*analyzer.GameAnalysis, error)
}

const (
	accessTokenLifetime  = time.Hour
	refreshTokenLifetime = 60 * 24 * time.Hour
)

func New(dbpool *db.Queries, analyzer *analyzer.Analyzer, JWTSecret string) *Handler {
	return &Handler{
		Queries:         dbpool,
		Analyzer:        analyzer,
		JWT_SECRET:      JWTSecret,
		ChessComClient:  &http.Client{Timeout: 5 * time.Second},
		ChessComBaseURL: defaultChessComBaseURL,
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

	req.Email = requests.NormalizeEmail(req.Email)
	req.ChessComUsername = strings.TrimSpace(req.ChessComUsername)

	if !requests.ValidEmail(req.Email) {
		http.Error(w, "enter a valid email address", http.StatusBadRequest)
		return
	}

	if !requests.ValidPassword(req.Password) {
		http.Error(w, "password must contain between 8 and 128 characters", http.StatusBadRequest)
		return
	}

	if !requests.ValidChessComUsername(req.ChessComUsername) {
		http.Error(w, "enter a valid Chess.com username", http.StatusBadRequest)
		return
	}

	switch h.validateChessComUsername(r.Context(), req.ChessComUsername) {
	case chessComUsernameInvalid:
		http.Error(w, "Chess.com username was not found", http.StatusBadRequest)
		return
	case chessComUsernameUnavailable:
		http.Error(w, "Chess.com username verification is temporarily unavailable", http.StatusServiceUnavailable)
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

	token, err := auth.MakeJWT(user.ID, h.JWT_SECRET, accessTokenLifetime)
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

	expiresAt := time.Now().UTC().Add(refreshTokenLifetime)
	_, err = h.Queries.CreateRefreshToken(r.Context(), db.CreateRefreshTokenParams{
		TokenHash: tokenHash,
		UserID:    user.ID,
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

	loginInfo.Email = requests.NormalizeEmail(loginInfo.Email)
	if !requests.ValidEmail(loginInfo.Email) || !requests.ValidPassword(loginInfo.Password) {
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	userInfo, err := h.Queries.GetUserByEmail(r.Context(), loginInfo.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Perform comparable password work so missing accounts are less distinguishable.
			_, _ = auth.HashPassword(loginInfo.Password)
			http.Error(w, "invalid email or password", http.StatusUnauthorized)
			return
		}
		slog.Error(
			"error fetching from database",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
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

	jwt, err := auth.MakeJWT(userInfo.ID, h.JWT_SECRET, accessTokenLifetime)
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

	expiresAt := time.Now().UTC().Add(refreshTokenLifetime)
	_, err = h.Queries.CreateRefreshToken(r.Context(), db.CreateRefreshTokenParams{
		TokenHash: tokenHash,
		UserID:    userInfo.ID,
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
		if _, revokeErr := h.Queries.RevokeRefreshTokenFamily(r.Context(), tokHash); revokeErr != nil {
			slog.Error(
				"error revoking replayed refresh token family",
				"request_id", middleware.GetReqID(r.Context()),
				"err", revokeErr,
			)
		}
		slog.Warn(
			"refresh token reuse detected",
			"request_id", middleware.GetReqID(r.Context()),
			"user_id", tokInfo.UserID,
		)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if !now.Before(tokInfo.ExpiresAt.Time) {
		_, _ = h.Queries.RevokeRefreshToken(r.Context(), tokHash)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	type RefreshResponse struct {
		AccessToken  string `json:"token"`
		RefreshToken string `json:"refresh_token"`
	}

	accessToken, err := auth.MakeJWT(
		tokInfo.UserID,
		h.JWT_SECRET,
		accessTokenLifetime,
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

	rawRefreshToken, err := auth.MakeRefreshToken()
	if err != nil {
		slog.Error(
			"error generating refresh token",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	_, err = h.Queries.RotateRefreshToken(r.Context(), db.RotateRefreshTokenParams{
		CurrentTokenHash: tokHash,
		NewTokenHash:     auth.HashRefreshToken(rawRefreshToken),
		NewExpiresAt: pgtype.Timestamptz{
			Time:  now.Add(refreshTokenLifetime),
			Valid: true,
		},
	})
	if errors.Is(err, pgx.ErrNoRows) {
		// Another use won the rotation race; treat this request as replay.
		_, _ = h.Queries.RevokeRefreshTokenFamily(r.Context(), tokHash)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if err != nil {
		slog.Error(
			"error rotating refresh token",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	render.Status(r, http.StatusOK)
	render.JSON(w, r, RefreshResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
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

func (h *Handler) PatchMe(w http.ResponseWriter, r *http.Request) {
	userId, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	var req requests.UpdateChessComUsernameReq
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.ChessComUsername = strings.TrimSpace(req.ChessComUsername)
	if !requests.ValidChessComUsername(req.ChessComUsername) {
		http.Error(w, "enter a valid Chess.com username", http.StatusBadRequest)
		return
	}

	switch h.validateChessComUsername(r.Context(), req.ChessComUsername) {
	case chessComUsernameInvalid:
		http.Error(w, "Chess.com username was not found", http.StatusBadRequest)
		return
	case chessComUsernameUnavailable:
		http.Error(w, "Chess.com username verification is temporarily unavailable", http.StatusServiceUnavailable)
		return
	}

	user, err := h.Queries.ChangeChessComUsername(r.Context(), db.ChangeChessComUsernameParams{
		ChessComUsername: req.ChessComUsername,
		ID:               userId,
	})
	if err != nil {
		slog.Error(
			"error updating chess.com username",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	res := Me{
		ID:               user.ID,
		Email:            user.Email,
		ChessComUsername: user.ChessComUsername,
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        user.UpdatedAt,
	}

	data, err := json.Marshal(res)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (h *Handler) DeleteMe(w http.ResponseWriter, r *http.Request) {
	userId, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	user, err := h.Queries.DeleteUser(r.Context(), userId)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	res := Me{
		ID:               user.ID,
		Email:            user.Email,
		ChessComUsername: user.ChessComUsername,
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        user.UpdatedAt,
	}

	data, err := json.Marshal(res)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userId, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	var req requests.ChangePasswordReq
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if !requests.ValidPassword(req.CurrentPassword) {
		http.Error(w, "current password is invalid", http.StatusBadRequest)
		return
	}

	if !requests.ValidPassword(req.NewPassword) {
		http.Error(w, "new password must contain between 8 and 128 characters", http.StatusBadRequest)
		return
	}

	user, err := h.Queries.GetUserById(r.Context(), userId)
	if err != nil {
		slog.Error(
			"error fetching user for password change",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	validPassword, err := auth.CheckPasswordHash(req.CurrentPassword, user.PasswordHash)
	if err != nil {
		slog.Error(
			"error checking password for password change",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if !validPassword {
		http.Error(w, "current password is incorrect", http.StatusUnauthorized)
		return
	}

	passwordHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		slog.Error(
			"error hashing new password",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	if _, err := h.Queries.ChangePassword(r.Context(), db.ChangePasswordParams{
		PasswordHash: passwordHash,
		ID:           userId,
	}); err != nil {
		slog.Error(
			"error updating password",
			"request_id", middleware.GetReqID(r.Context()),
			"err", err,
		)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

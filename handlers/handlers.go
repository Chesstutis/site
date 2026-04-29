package handlers

import (
	//"encoding/json"
	//"log"
	"net/http"

	"github.com/chesstutis/analyzer"
	"github.com/chesstutis/site/db"
)

type Handler struct {
	DB          *db.DB
	Analyzer    *analyzer.Analyzer
}

func New(dbpool *db.DB, analyzer *analyzer.Analyzer) *Handler {
	return &Handler{
		DB: dbpool,
		Analyzer: analyzer,
	}
}

func (h *Handler) PingHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("pong"))
}

func (h *Handler) AnalyzeGames(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("analyzing games...."))
}
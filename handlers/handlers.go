package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/agoblet/chesscompubapi"
	"github.com/chesstutis/analyzer"
	"github.com/chesstutis/site/db"
)

type Handler struct {
	DB          *db.DB
	ChessClient *chesscompubapi.Client
	Analyzer    *analyzer.Analyzer
}

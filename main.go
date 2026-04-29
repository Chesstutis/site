package main

import (
	"context"
	"net/http"
	"os"

	"github.com/chesstutis/site/db"
	"github.com/chesstutis/site/handlers"
	"github.com/chesstutis/analyzer"
	"github.com/corentings/chess/v2/uci"


	"github.com/joho/godotenv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	godotenv.Load()
	dbpool := db.New(context.Background(), os.Getenv("DATABASE_URL"))
	eng, err := uci.New("stockfish")
	if err != nil {
		panic(err)
	}

	a, err := analyzer.NewAnalyzer(eng, analyzer.DefaultConfig())
	if err != nil {
		panic(err)
	}

	r := chi.NewRouter()
	h := handlers.New(dbpool, a)

	r.Use(middleware.Logger)

	r.Get("/ping", h.PingHandler)

	r.Route("/api", func(chi chi.Router) {
		r.Post("/analyze", h.AnalyzeGames)
	})

	http.ListenAndServe(":"+os.Getenv("SERVER_PORT"), r)
}

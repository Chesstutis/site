package main

import (
	"context"
	"net/http"
	"os"

	"github.com/chesstutis/analyzer"
	"github.com/chesstutis/site/db"
	"github.com/chesstutis/site/handlers"
	"github.com/corentings/chess/v2/uci"

	"github.com/joho/godotenv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
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

	r.Use(cors.Handler(cors.Options{
		// AllowedOrigins:   []string{"https://foo.com"}, // Use this to allow specific origin hosts
		AllowedOrigins: []string{"https://*", "http://*"},
		// AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	r.Get("/ping", h.PingHandler)

	r.Route("/api", func(chi chi.Router) {
		chi.Post("/analyze", h.AnalyzeGames)
	})

	http.ListenAndServe(":"+os.Getenv("SERVER_PORT"), r)
}

package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"os"

	"github.com/chesstutis/analyzer"
	"github.com/corentings/chess/v2/uci"

	"github.com/joho/godotenv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/chesstutis/site/internal/db"
	"github.com/chesstutis/site/internal/handlers"
	"github.com/chesstutis/site/internal/observability"

	"github.com/grafana/pyroscope-go"
)

//go:embed frontend/dist
var frontendDist embed.FS

func main() {
	pyroscope.Start(observability.PyroConfig())
	godotenv.Load()
	dbpool := db.New(context.Background(), os.Getenv("DATABASE_URL"))
	eng, err := uci.New(os.Getenv("STOCKFISH_PATH"))
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

	r.Handle("/metrics", observability.HandleMetrics())
	r.Get("/ping", h.PingHandler)
	r.Route("/api", func(chi chi.Router) {
		chi.Post("/analyze", h.AnalyzeGames)
	})

	distFS, err := fs.Sub(frontendDist, "frontend/dist")
	if err != nil {
		panic(err)
	}

	serveIndex := func(w http.ResponseWriter, r *http.Request) {
		index, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(index)
	}

	r.Get("/", serveIndex)
	r.Get("/home", serveIndex)
	r.Get("/solve", serveIndex)

	r.Handle("/assets/*", http.FileServer(http.FS(distFS)))

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead {
			serveIndex(w, r)
			return
		}
		http.NotFound(w, r)
	})

	fmt.Printf("listening on port %s\n", os.Getenv("SERVER_PORT"))
	if err := http.ListenAndServe(":"+os.Getenv("SERVER_PORT"), r); err != nil {
		panic(err)
	}
}

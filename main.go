package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"net"
	"os"
	"time"
	"log"

	"github.com/chesstutis/analyzer"
	"github.com/corentings/chess/v2/uci"

	"github.com/joho/godotenv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/chesstutis/site/internal/auth"
	"github.com/chesstutis/site/internal/db"
	"github.com/chesstutis/site/internal/handlers"
	// "github.com/chesstutis/site/internal/observability"
	// "github.com/grafana/pyroscope-go"
)

//go:embed frontend/dist
var frontendDist embed.FS

func main() {
	// pyroscope.Start(observability.PyroConfig())
	godotenv.Load()
	dbpool, err := db.NewPool(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		panic(err)
	}
	defer dbpool.Close()

	queries := db.New(dbpool)

	eng, err := uci.New(os.Getenv("STOCKFISH_PATH"))
	if err != nil {
		panic(err)
	}
	defer eng.Close()

	betaUsername := os.Getenv("BETA_USERNAME")
	betaPassword := os.Getenv("BETA_PASSWORD")

	if betaUsername == "" || betaPassword == "" {
		log.Fatal("beta username and password are required")
	}
	betaAuth := middleware.BasicAuth(
		"Chesstutis Private Beta",
		map[string]string{
			betaUsername: betaPassword,
		},
	)

	analysisConfig := analyzer.DefaultConfig()
	analysisConfig.Threads = 1
	analysisConfig.HashMB = 128
	a, err := analyzer.NewAnalyzer(eng, analysisConfig)
	if err != nil {
		panic(err)
	}
	defer a.Close()

	tokenSecret := os.Getenv("JWT_SECRET")
	if tokenSecret == "" {
		panic("JWT_SECRET is required")
	}

	r := chi.NewRouter()
	h := handlers.New(queries, a, tokenSecret)

	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// =================================
	// ----------- ROUTES --------------
	// =================================

	// r.Handle("/metrics", observability.HandleMetrics())
	// r.Get("/ping", h.PingHandler)
	r.Route("/api", func(r chi.Router) {

		r.Group(func(r chi.Router) {
			r.Use(betaAuth)

			r.Post("/auth/signup", h.Signup)
			r.Post("/auth/login", h.Login)
		})

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth(tokenSecret))
			r.Get("/me", h.GetMe)
			r.Get("/me/puzzles/stats", h.PuzzleStats)

			r.Post("/analyze", h.AnalyzeGames)
		})
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

	// frontend routes
	r.Group(func(r chi.Router) {
		r.Use(betaAuth)
		r.Get("/", serveIndex)
		r.Get("/home", serveIndex)
		r.Get("/solve", serveIndex)
		r.Get("/login", serveIndex)
		r.Get("/signup", serveIndex)
		r.Get("/dashboard", serveIndex)

		r.Handle("/assets/*", http.FileServer(http.FS(distFS)))
	})

	betaFallback := betaAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    		if r.Method == http.MethodGet || r.Method == http.MethodHead {
        		serveIndex(w, r)
        		return
    		}

    		http.NotFound(w, r)
	}))

	r.NotFound(betaFallback.ServeHTTP)

	//r.NotFound(func(w http.ResponseWriter, r *http.Request) {
	//	if r.Method == http.MethodGet || r.Method == http.MethodHead {
	//		serveIndex(w, r)
	//		return
	//	}
	//	http.NotFound(w, r)
	//})

	serverAddr := os.Getenv("SERVER_ADDR")
	if serverAddr == "" {
		log.Fatal(err)
	}

	serverPort := os.Getenv("SERVER_PORT")
	if serverPort == "" {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr: net.JoinHostPort(serverAddr, serverPort),
		Handler: r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout: 15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout: 60 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}

	fmt.Printf("app starter at http://localhost:%s\n", serverPort)
	log.Fatal(server.ListenAndServe())
}

package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"time"

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

	h := handlers.New(queries, a, tokenSecret)

	distFS, err := fs.Sub(frontendDist, "frontend/dist")
	if err != nil {
		panic(err)
	}
	r := newRouter(h, distFS, betaUsername, betaPassword, tokenSecret)

	serverAddr := os.Getenv("SERVER_ADDR")
	if serverAddr == "" {
		log.Fatal(err)
	}

	serverPort := os.Getenv("SERVER_PORT")
	if serverPort == "" {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr:              net.JoinHostPort(serverAddr, serverPort),
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	fmt.Printf("app started at http://localhost:%s\n", serverPort)
	log.Fatal(server.ListenAndServe())
}

func newRouter(h *handlers.Handler, distFS fs.FS, betaUsername, betaPassword, tokenSecret string) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	betaAuth := middleware.BasicAuth(
		"Chesstutis Private Beta",
		map[string]string{betaUsername: betaPassword},
	)
	signupLimiter := auth.NewRateLimiter(5, 15*time.Minute)
	loginLimiter := auth.NewRateLimiter(10, 15*time.Minute)
	refreshLimiter := auth.NewRateLimiter(30, time.Minute)
	accountChangeLimiter := auth.NewRateLimiter(10, 15*time.Minute)

	r.Route("/api", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(betaAuth)
			r.With(signupLimiter.Middleware).Post("/auth/signup", h.Signup)
			r.With(loginLimiter.Middleware).Post("/auth/login", h.Login)
		})

		r.With(refreshLimiter.Middleware).Post("/auth/refresh", h.Refresh)
		r.With(refreshLimiter.Middleware).Post("/auth/revoke", h.Revoke)

		r.Group(func(r chi.Router) {
			r.Use(auth.RequireAuth(tokenSecret))
			r.Get("/me", h.GetMe)
			r.With(accountChangeLimiter.Middleware).Patch("/me", h.PatchMe)
			r.With(accountChangeLimiter.Middleware).Delete("/me", h.DeleteMe)
			r.With(accountChangeLimiter.Middleware).Put("/me/password", h.ChangePassword)
			r.Get("/me/puzzles/stats", h.PuzzleStats)
			r.Post("/analyze", h.AnalyzeGames)
		})
	})

	serveIndex := func(w http.ResponseWriter, r *http.Request) {
		index, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(index)
	}

	r.Group(func(r chi.Router) {
		r.Use(betaAuth)
		r.Get("/", serveIndex)
		r.Get("/home", serveIndex)
		r.Get("/solve", serveIndex)
		r.Get("/login", serveIndex)
		r.Get("/signup", serveIndex)
		r.Get("/dashboard", serveIndex)
		r.Get("/account", serveIndex)
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

	return r
}

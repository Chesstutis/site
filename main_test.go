package main

import (
	"context"
	"errors"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/chesstutis/site/internal/auth"
	"github.com/chesstutis/site/internal/db"
	"github.com/chesstutis/site/internal/handlers"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const (
	routerTestBetaUsername = "beta-user"
	routerTestBetaPassword = "beta-password"
	routerTestJWTSecret    = "router-test-secret"
)

type routerTestStore struct{}

func (routerTestStore) Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, errors.New("database unavailable")
}

func (routerTestStore) Query(context.Context, string, ...interface{}) (pgx.Rows, error) {
	return nil, errors.New("database unavailable")
}

func (routerTestStore) QueryRow(context.Context, string, ...interface{}) pgx.Row {
	return routerTestRow{}
}

type routerTestRow struct{}

func (routerTestRow) Scan(...interface{}) error {
	return errors.New("database unavailable")
}

func testRouter(t *testing.T) http.Handler {
	t.Helper()

	distFS, err := fs.Sub(frontendDist, "frontend/dist")
	if err != nil {
		t.Fatalf("open embedded frontend: %v", err)
	}
	handler := handlers.New(db.New(routerTestStore{}), nil, routerTestJWTSecret)
	return newRouter(handler, distFS, routerTestBetaUsername, routerTestBetaPassword, routerTestJWTSecret)
}

func TestRegisteredRoutes(t *testing.T) {
	router, ok := testRouter(t).(chi.Routes)
	if !ok {
		t.Fatal("router does not expose its route tree")
	}

	expected := map[string]bool{
		http.MethodPost + " /api/auth/signup":     false,
		http.MethodPost + " /api/auth/login":      false,
		http.MethodPost + " /api/auth/refresh":    false,
		http.MethodPost + " /api/auth/revoke":     false,
		http.MethodGet + " /api/me":               false,
		http.MethodPatch + " /api/me":             false,
		http.MethodDelete + " /api/me":            false,
		http.MethodPut + " /api/me/password":      false,
		http.MethodGet + " /api/me/puzzles/stats": false,
		http.MethodPost + " /api/analyze":         false,
		http.MethodGet + " /":                     false,
		http.MethodGet + " /home":                 false,
		http.MethodGet + " /solve":                false,
		http.MethodGet + " /login":                false,
		http.MethodGet + " /signup":               false,
		http.MethodGet + " /dashboard":            false,
		http.MethodGet + " /account":              false,
		"* /assets/*":                             false,
	}

	if err := chi.Walk(router, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		key := method + " " + route
		if route == "/assets/*" {
			key = "* /assets/*"
		}
		if _, ok := expected[key]; !ok {
			t.Errorf("registered route %s has no route test", key)
			return nil
		}
		expected[key] = true
		return nil
	}); err != nil {
		t.Fatalf("walk routes: %v", err)
	}

	for route, found := range expected {
		if !found {
			t.Errorf("expected route %s is not registered", route)
		}
	}
}

func TestAPIRoutes(t *testing.T) {
	router := testRouter(t)
	token, err := auth.MakeJWT(42, routerTestJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("make access token: %v", err)
	}

	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		betaAuth   bool
		bearerAuth bool
		wantStatus int
	}{
		{"signup", http.MethodPost, "/api/auth/signup", "{", true, false, http.StatusBadRequest},
		{"login", http.MethodPost, "/api/auth/login", "{", true, false, http.StatusBadRequest},
		{"refresh", http.MethodPost, "/api/auth/refresh", "", true, false, http.StatusUnauthorized},
		{"revoke", http.MethodPost, "/api/auth/revoke", "", true, false, http.StatusUnauthorized},
		{"get account", http.MethodGet, "/api/me", "", false, true, http.StatusInternalServerError},
		{"update account", http.MethodPatch, "/api/me", "{", false, true, http.StatusBadRequest},
		{"delete account", http.MethodDelete, "/api/me", "", false, true, http.StatusInternalServerError},
		{"change password", http.MethodPut, "/api/me/password", "{", false, true, http.StatusBadRequest},
		{"puzzle stats", http.MethodGet, "/api/me/puzzles/stats", "", false, true, http.StatusInternalServerError},
		{"analyze games", http.MethodPost, "/api/analyze", "{", false, true, http.StatusBadRequest},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(test.method, test.path, strings.NewReader(test.body))
			request.Header.Set("Content-Type", "application/json")
			if test.betaAuth {
				request.SetBasicAuth(routerTestBetaUsername, routerTestBetaPassword)
			}
			if test.bearerAuth {
				request.Header.Set("Authorization", "Bearer "+token)
			}

			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, request)
			response := recorder.Result()
			defer response.Body.Close()

			if response.StatusCode != test.wantStatus {
				t.Fatalf("status = %d, want %d; body = %q", response.StatusCode, test.wantStatus, recorder.Body.String())
			}
		})
	}
}

func TestFrontendRoutes(t *testing.T) {
	router := testRouter(t)
	paths := []string{"/", "/home", "/solve", "/login", "/signup", "/dashboard", "/account"}

	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, path, nil)
			request.SetBasicAuth(routerTestBetaUsername, routerTestBetaPassword)
			recorder := httptest.NewRecorder()

			router.ServeHTTP(recorder, request)
			response := recorder.Result()
			defer response.Body.Close()

			if response.StatusCode != http.StatusOK {
				t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
			}
			if got := response.Header.Get("Content-Type"); got != "text/html; charset=utf-8" {
				t.Fatalf("Content-Type = %q, want HTML", got)
			}
		})
	}
}

func TestFrontendAssetRoute(t *testing.T) {
	distFS, err := fs.Sub(frontendDist, "frontend/dist")
	if err != nil {
		t.Fatalf("open embedded frontend: %v", err)
	}
	assets, err := fs.ReadDir(distFS, "assets")
	if err != nil {
		t.Fatalf("read embedded assets: %v", err)
	}

	var assetPath string
	for _, asset := range assets {
		if strings.HasSuffix(asset.Name(), ".css") {
			assetPath = "/assets/" + asset.Name()
			break
		}
	}
	if assetPath == "" {
		t.Fatal("embedded frontend has no CSS asset")
	}

	request := httptest.NewRequest(http.MethodGet, assetPath, nil)
	request.SetBasicAuth(routerTestBetaUsername, routerTestBetaPassword)
	recorder := httptest.NewRecorder()
	testRouter(t).ServeHTTP(recorder, request)
	response := recorder.Result()
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	if got := response.Header.Get("Content-Type"); !strings.HasPrefix(got, "text/css") {
		t.Fatalf("Content-Type = %q, want CSS", got)
	}
}

func TestFrontendFallback(t *testing.T) {
	router := testRouter(t)

	tests := []struct {
		name       string
		method     string
		betaAuth   bool
		wantStatus int
	}{
		{"GET serves the SPA", http.MethodGet, true, http.StatusOK},
		{"HEAD serves the SPA", http.MethodHead, true, http.StatusOK},
		{"non-read method is not found", http.MethodPost, true, http.StatusNotFound},
		{"beta authentication is required", http.MethodGet, false, http.StatusUnauthorized},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(test.method, "/client-side-route", nil)
			if test.betaAuth {
				request.SetBasicAuth(routerTestBetaUsername, routerTestBetaPassword)
			}
			recorder := httptest.NewRecorder()

			router.ServeHTTP(recorder, request)
			response := recorder.Result()
			defer response.Body.Close()

			if response.StatusCode != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.StatusCode, test.wantStatus)
			}
		})
	}
}

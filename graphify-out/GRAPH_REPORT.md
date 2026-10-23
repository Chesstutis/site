# Graph Report - site  (2026-10-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 651 nodes · 1751 edges · 36 communities (25 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b52dad15`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Account.tsx
- analysis_test.go
- testing.T
- Handler
- AuthProvider.tsx
- components.json
- package.json
- RateLimiter
- compilerOptions
- context.Context
- dependencies
- compilerOptions
- devDependencies
- github.com/jackc/pgx/v5/pgtype.Int4
- github.com/jackc/pgx/v5/pgtype.Timestamptz
- api/chessCom.ts
- analysisRows
- profileHandlerStore
- .fetchChessComPlayerID
- DBTX
- github.com/jackc/pgx/v5/pgconn.CommandTag
- ChessComRatingSnapshot
- github.com/jackc/pgx/v5/pgtype.UUID
- eslint.config.js
- analysisStore
- longToShortNotation
- tsconfig.json
- vite.config.ts
- authHandlerStore
- ratingsHandlerStore
- refreshStore
- scripts
- fakeGameAnalyzer
- pyroscope.go
- github.com/chesstutis/site

## God Nodes (most connected - your core abstractions)
1. `cn()` - 42 edges
2. `Account()` - 39 edges
3. `Handler` - 25 edges
4. `New()` - 20 edges
5. `Solve()` - 19 edges
6. `compilerOptions` - 19 edges
7. `Button()` - 18 edges
8. `Signup()` - 18 edges
9. `useAuth()` - 17 edges
10. `Dashboard()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `newRouter()` --references--> `Handler`  [EXTRACTED]
  main.go → internal/handlers/handlers.go
- `newRouter()` --calls--> `RequireAuth()`  [EXTRACTED]
  main.go → internal/auth/middleware.go
- `main()` --calls--> `New()`  [EXTRACTED]
  main.go → internal/db/db.go
- `main()` --calls--> `New()`  [EXTRACTED]
  main.go → internal/handlers/handlers.go
- `TestAPIRoutes()` --calls--> `MakeJWT()`  [EXTRACTED]
  main_test.go → internal/auth/auth.go

## Import Cycles
- None detected.

## Communities (36 total, 11 thin omitted)

### Community 0 - "Account.tsx"
Cohesion: 0.07
Nodes (93): RFC-5321, analyzeGames(), attemptPuzzle(), changePassword(), deleteAccount(), getAccountInfo(), getAnalyzedGameUUIDs(), getChessComRatingComparison() (+85 more)

### Community 1 - "analysis_test.go"
Cohesion: 0.14
Nodes (3): contextKey, valueRow, routerTestRow

### Community 2 - "testing.T"
Cohesion: 0.09
Nodes (55): accountHTTPDoer, accountStore, CheckPasswordHash(), MakeJWT(), TestExpireJWT(), TestHashAndComparePassword(), TestValidJWT(), ValidateJWT() (+47 more)

### Community 3 - "Handler"
Cohesion: 0.09
Nodes (22): gameAnalyzer, httpDoer, GetBearerToken(), HashPassword(), HashRefreshToken(), MakeRefreshToken(), UserIDFromContext(), Handler (+14 more)

### Community 4 - "AuthProvider.tsx"
Cohesion: 0.16
Nodes (19): AuthContext, authenticate(), AuthProvider(), getTokenExpiration(), parseAuthUser(), readStoredSession(), refreshTokens(), AuthContextValue (+11 more)

### Community 5 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "package.json"
Cohesion: 0.09
Nodes (21): name, private, type, version, @babel/core, babel-plugin-react-compiler, chess.js, clsx (+13 more)

### Community 7 - "RateLimiter"
Cohesion: 0.13
Nodes (8): rateLimitEntry, RateLimiter, NewRateLimiter(), TestRateLimiter(), NewPool(), HandleMetrics(), main(), newRouter()

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 9 - "context.Context"
Cohesion: 0.12
Nodes (6): ChangeChessComUsernameParams, GetPuzzleForAttemptParams, GetUnsolvedPuzzlesRow, MarkPuzzleSolvedParams, accountRow, User

### Community 10 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @base-ui/react, chess.js, class-variance-authority, clsx, @fontsource-variable/geist, jwt-decode, lucide-react (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 12 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, @babel/core, babel-plugin-react-compiler, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+9 more)

### Community 13 - "github.com/jackc/pgx/v5/pgtype.Int4"
Cohesion: 0.16
Nodes (13): chessComRatings, chessComRatingStat, ratingsResponse, ratingValues, nullableRating(), parseChessComRatings(), ratingFromStat(), ratingValuesFromPG() (+5 more)

### Community 14 - "github.com/jackc/pgx/v5/pgtype.Timestamptz"
Cohesion: 0.16
Nodes (8): ChangePasswordParams, ChangePasswordRow, CreateRefreshTokenParams, RotateRefreshTokenParams, AuthResponse, Me, refreshRow, RefreshToken

### Community 15 - "api/chessCom.ts"
Cohesion: 0.26
Nodes (9): archivesUrl(), getArchives(), getGamesArchive(), getLatestGames(), MAX_ANALYSIS_GAMES, ArchivesResponse, ChessGame, ChessPlayer (+1 more)

### Community 17 - "profileHandlerStore"
Cohesion: 0.20
Nodes (3): profileHandlerStore, profileStatsRow, GetPuzzleStatsRow

### Community 18 - ".fetchChessComPlayerID"
Cohesion: 0.25
Nodes (5): CreateUserWithRatingSnapshotRow, chessComUsernameStatus, CreateUserWithRatingSnapshotParams, sameChessComAccount(), TestSameChessComAccount()

### Community 21 - "ChessComRatingSnapshot"
Cohesion: 0.25
Nodes (4): Puzzle, ratingSnapshotRow, ChessComRatingSnapshot, hasRatings()

### Community 22 - "github.com/jackc/pgx/v5/pgtype.UUID"
Cohesion: 0.29
Nodes (3): AnalyzedGame, IsGameAnalyzedParams, SaveAnalyzedGameParams

### Community 23 - "eslint.config.js"
Cohesion: 0.29
Nodes (6): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, typescript-eslint

### Community 25 - "longToShortNotation"
Cohesion: 0.60
Nodes (5): isEnPassantCapture(), isSquare(), longToShortNotation(), parseFenBoard(), pieceToNotation()

### Community 26 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, files, references

### Community 27 - "vite.config.ts"
Cohesion: 0.33
Nodes (4): @rolldown/plugin-babel, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 31 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

## Knowledge Gaps
- **13 isolated node(s):** `RFC-5321`, `github.com/chesstutis/site`, `@babel/core`, `babel-plugin-react-compiler`, `@fontsource-variable/geist` (+8 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 202 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Account.tsx` to `AuthProvider.tsx`, `package.json`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `RFC-5321`, `github.com/chesstutis/site`, `@babel/core` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Account.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07206012378426171 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `analysis_test.go` be split into smaller, more focused modules?**
  _Cohesion score 0.13784021071115013 - nodes in this community are weakly interconnected._
- **Why does `analysisRows` connect `analysisRows` to `analysis_test.go`, `github.com/jackc/pgx/v5/pgconn.CommandTag`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `testing.T` be split into smaller, more focused modules?**
  _Cohesion score 0.08797814207650273 - nodes in this community are weakly interconnected._
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS frontend-build
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM golang:1.26.2-bookworm AS backend-build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . ./
COPY --from=frontend-build /src/frontend/dist ./frontend/dist

RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/site \
    .

# Included so Compose can run migrations before starting the application.
ARG GOOSE_VERSION=v3.24.1
RUN CGO_ENABLED=0 GOBIN=/out go install \
    github.com/pressly/goose/v3/cmd/goose@${GOOSE_VERSION}


FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates stockfish \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --home-dir /app app

WORKDIR /app

COPY --from=backend-build /out/site /app/site
COPY --from=backend-build /out/goose /usr/local/bin/goose
COPY sql/migrations /app/sql/migrations

USER app

EXPOSE 8080

CMD ["/app/site"]
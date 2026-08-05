-- +goose Up
CREATE TABLE chess_com_rating_snapshots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    bullet_rating INTEGER,
    blitz_rating INTEGER,
    rapid_rating INTEGER,
    daily_rating INTEGER,

    UNIQUE (user_id, captured_at)
);

CREATE INDEX chess_com_rating_snapshots_user_time_idx
ON chess_com_rating_snapshots (user_id, captured_at DESC);

-- +goose Down
DROP TABLE chess_com_rating_snapshots;

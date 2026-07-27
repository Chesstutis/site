-- +goose Up
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    chess_com_username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE puzzles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puzzle JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    comment TEXT
    created_at TIMESTAMPTZ DEFAULT now()
    solved_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX puzzles_user_id_idx
ON puzzles(user_id);

-- +goose Down
DROP TABLE users;
DROP TABLE puzzles;
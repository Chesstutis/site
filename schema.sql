CREATE TABLE users {
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    chess_com_username TEXT NOT NULL,
};

CREATE TABLE puzzles {
    puzzle JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    comment TEXT,
};
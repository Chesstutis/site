-- +goose Up
CREATE TABLE analyzed_games (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_uuid UUID NOT NULL,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, game_uuid)
);

ALTER TABLE puzzles
    ADD COLUMN source_game_uuid UUID,
    ADD COLUMN puzzle_index INTEGER;

CREATE UNIQUE INDEX puzzles_source_game_idx
ON puzzles(user_id, source_game_uuid, puzzle_index)
WHERE source_game_uuid IS NOT NULL;

-- +goose Down
DROP INDEX puzzles_source_game_idx;
ALTER TABLE puzzles DROP COLUMN puzzle_index, DROP COLUMN source_game_uuid;
DROP TABLE analyzed_games;

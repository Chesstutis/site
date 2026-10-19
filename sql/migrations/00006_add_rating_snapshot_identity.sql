-- +goose Up
ALTER TABLE chess_com_rating_snapshots
    ADD COLUMN chess_com_username TEXT,
    ADD COLUMN chess_com_player_id BIGINT;

-- +goose Down
ALTER TABLE chess_com_rating_snapshots
    DROP COLUMN chess_com_player_id,
    DROP COLUMN chess_com_username;

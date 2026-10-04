-- +goose Up
ALTER TABLE refresh_tokens
ADD COLUMN family_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX refresh_tokens_family_id_idx
ON refresh_tokens(family_id);

-- +goose Down
DROP INDEX refresh_tokens_family_id_idx;

ALTER TABLE refresh_tokens
DROP COLUMN family_id;

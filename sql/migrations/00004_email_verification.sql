-- +goose Up
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE TABLE email_verification_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX email_verification_tokens_user_id_idx
ON email_verification_tokens(user_id);

-- +goose Down
DROP TABLE email_verification_tokens;
ALTER TABLE users DROP COLUMN email_verified_at;

ALTER TABLE email ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS email_deleted_at_idx ON email(deleted_at);

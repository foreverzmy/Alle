ALTER TABLE email ADD COLUMN archived_at TEXT
  CHECK (archived_at IS NULL OR deleted_at IS NULL);
CREATE INDEX email_archived_at_idx ON email(archived_at) WHERE deleted_at IS NULL;

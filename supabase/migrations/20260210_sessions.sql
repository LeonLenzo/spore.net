-- Sessions table for server-side session management
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast expiry cleanup
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- RLS: only service role can access sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- No policies = no access via anon/authenticated keys; service role bypasses RLS

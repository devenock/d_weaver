-- COLLABORATION_SESSIONS (PDF: real-time collaboration state)
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cursor_position JSONB,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(diagram_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_diagram ON collaboration_sessions(diagram_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user ON collaboration_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_last_seen ON collaboration_sessions(last_seen);

-- DIAGRAMS (from DWeaver Backend Project Requirements PDF)
CREATE TABLE IF NOT EXISTS diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    diagram_type VARCHAR(50) NOT NULL,
    image_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagrams_user ON diagrams(user_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_workspace ON diagrams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_is_public ON diagrams(is_public) WHERE is_public = TRUE;

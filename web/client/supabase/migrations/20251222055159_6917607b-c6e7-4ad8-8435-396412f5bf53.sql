-- Add color and tags to workspaces for organization
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for faster tag searches
CREATE INDEX IF NOT EXISTS idx_workspaces_tags ON public.workspaces USING GIN(tags);
-- Create workspace role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace members table
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create workspace invitations table for pending invites
CREATE TABLE public.workspace_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(workspace_id, email)
);

-- Add workspace_id to diagrams (nullable for backwards compatibility)
ALTER TABLE public.diagrams ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_diagrams_workspace_id ON public.diagrams(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

-- Enable RLS on all new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
  )
$$;

-- Security definer function to check if user is workspace admin or owner
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Workspaces RLS policies
CREATE POLICY "Users can view workspaces they are members of"
ON public.workspaces FOR SELECT
USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Workspace admins can update their workspaces"
ON public.workspaces FOR UPDATE
USING (public.is_workspace_admin(auth.uid(), id));

CREATE POLICY "Workspace owners can delete workspaces"
ON public.workspaces FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.workspace_members
  WHERE workspace_id = id AND user_id = auth.uid() AND role = 'owner'
));

-- Workspace members RLS policies
CREATE POLICY "Users can view members of their workspaces"
ON public.workspace_members FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  public.is_workspace_admin(auth.uid(), workspace_id) OR
  (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = workspace_id AND created_by = auth.uid()
  ))
);

CREATE POLICY "Workspace admins can update members"
ON public.workspace_members FOR UPDATE
USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can remove members"
ON public.workspace_members FOR DELETE
USING (public.is_workspace_admin(auth.uid(), workspace_id) OR auth.uid() = user_id);

-- Workspace invitations RLS policies
CREATE POLICY "Workspace admins can view invitations"
ON public.workspace_invitations FOR SELECT
USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can create invitations"
ON public.workspace_invitations FOR INSERT
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete invitations"
ON public.workspace_invitations FOR DELETE
USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- Update diagrams RLS policies to include workspace access
DROP POLICY IF EXISTS "Users can view their own diagrams" ON public.diagrams;
CREATE POLICY "Users can view diagrams"
ON public.diagrams FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  (is_public = true) OR
  (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
);

-- Update timestamp trigger for workspaces
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
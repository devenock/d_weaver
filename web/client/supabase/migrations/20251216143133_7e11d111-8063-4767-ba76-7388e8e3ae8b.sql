-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;

-- Create a PERMISSIVE INSERT policy instead
CREATE POLICY "Authenticated users can create workspaces" 
ON public.workspaces 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix workspace_members INSERT policy to be permissive for the creator
DROP POLICY IF EXISTS "Workspace admins can add members" ON public.workspace_members;

CREATE POLICY "Workspace admins can add members" 
ON public.workspace_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_workspace_admin(auth.uid(), workspace_id) 
  OR (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = workspace_members.workspace_id 
    AND workspaces.created_by = auth.uid()
  ))
);
-- Drop the problematic delete policy and fix it
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON public.workspaces;

-- Create a corrected delete policy
CREATE POLICY "Workspace owners can delete workspaces" 
ON public.workspaces 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id 
      AND wm.user_id = auth.uid() 
      AND wm.role = 'owner'::workspace_role
  )
);
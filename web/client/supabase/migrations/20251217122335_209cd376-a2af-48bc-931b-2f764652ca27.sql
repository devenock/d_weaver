-- Create a security definer function to create workspaces atomically
CREATE OR REPLACE FUNCTION public.create_workspace(
  _name text,
  _description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace_id uuid;
  _user_id uuid;
BEGIN
  -- Get the current user's ID
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Create the workspace
  INSERT INTO public.workspaces (name, description, created_by)
  VALUES (_name, _description, _user_id)
  RETURNING id INTO _workspace_id;
  
  -- Add the creator as owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (_workspace_id, _user_id, 'owner');
  
  RETURN _workspace_id;
END;
$$;
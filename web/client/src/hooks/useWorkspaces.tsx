import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
// Removed unused _WorkspaceMember type
type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
  memberCount?: number;
}

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<WorkspaceWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();

    // Subscribe to workspace changes
    const channel = supabase
      .channel("workspace-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspaces" },
        () => loadWorkspaces(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workspace_members" },
        () => loadWorkspaces(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadWorkspaces = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      // Get all workspaces the user is a member of
      const { data: memberships, error: memberError } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      const workspaceIds = memberships.map((m) => m.workspace_id);

      const { data: workspacesData, error: workspacesError } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", workspaceIds);

      if (workspacesError) throw workspacesError;

      // Combine workspace data with roles
      const workspacesWithRoles: WorkspaceWithRole[] = (
        workspacesData || []
      ).map((w) => ({
        ...w,
        role:
          (memberships.find((m) => m.workspace_id === w.id)
            ?.role as WorkspaceRole) || "member",
      }));

      setWorkspaces(workspacesWithRoles);

      // Restore last selected workspace from localStorage or select first
      const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");
      if (
        savedWorkspaceId &&
        workspacesWithRoles.find((w) => w.id === savedWorkspaceId)
      ) {
        setCurrentWorkspace(
          workspacesWithRoles.find((w) => w.id === savedWorkspaceId) || null,
        );
      } else if (workspacesWithRoles.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(workspacesWithRoles[0]);
      }
    } catch (error) {
      console.error("Error loading workspaces:", error);
      toast.error("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspace = (workspace: WorkspaceWithRole) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem("currentWorkspaceId", workspace.id);
  };

  const createWorkspace = async (name: string, description?: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use the security definer function to create workspace atomically
      const { data: workspaceId, error: createError } = await supabase.rpc(
        "create_workspace",
        {
          _name: name,
          _description: description || undefined,
        },
      );

      if (createError) throw createError;

      // Fetch the full workspace data
      const { data: workspace, error: fetchError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();

      if (fetchError) throw fetchError;

      toast.success("Workspace created successfully!");
      await loadWorkspaces();

      // Select the new workspace
      const newWorkspace = { ...workspace, role: "owner" as WorkspaceRole };
      selectWorkspace(newWorkspace);

      return workspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to create workspace");
      throw error;
    }
  };

  const updateWorkspace = async (
    workspaceId: string,
    updates: {
      name?: string;
      description?: string;
      color?: string | null;
      tags?: string[];
    },
  ) => {
    try {
      const { error } = await supabase
        .from("workspaces")
        .update(updates)
        .eq("id", workspaceId);

      if (error) throw error;

      toast.success("Workspace updated successfully!");
      await loadWorkspaces();
    } catch (error) {
      console.error("Error updating workspace:", error);
      toast.error("Failed to update workspace");
      throw error;
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    try {
      const { error } = await supabase
        .from("workspaces")
        .delete()
        .eq("id", workspaceId);

      if (error) throw error;

      toast.success("Workspace deleted successfully!");
      await loadWorkspaces();

      // If we deleted the current workspace, select another
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(
          workspaces.find((w) => w.id !== workspaceId) || null,
        );
      }
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace");
      throw error;
    }
  };

  return {
    workspaces,
    currentWorkspace,
    loading,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refreshWorkspaces: loadWorkspaces,
  };
};

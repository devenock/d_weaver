import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import * as workspaceApi from "@/lib/workspace-api";
import type { WorkspaceWithRoleResponse } from "@/lib/api-types";
import { getApiErrorMessage } from "@/lib/api";

export type WorkspaceWithRole = WorkspaceWithRoleResponse;

export const useWorkspaces = () => {
  const { getAccessToken } = useAuth();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<WorkspaceWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = async () => {
    const token = getAccessToken();
    if (!token) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      return;
    }
    try {
      const list = await workspaceApi.listWorkspaces(token);
      setWorkspaces(list);

      const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");
      setCurrentWorkspace((prev) => {
        if (
          savedWorkspaceId &&
          list.some((w) => w.id === savedWorkspaceId)
        ) {
          return list.find((w) => w.id === savedWorkspaceId) ?? null;
        }
        if (
          list.length > 0 &&
          (!prev || !list.some((w) => w.id === prev.id))
        ) {
          return list[0];
        }
        return prev;
      });
    } catch (err) {
      console.error("Error loading workspaces:", err);
      const message = getApiErrorMessage(err, "Failed to load workspaces");
      toast({ title: "Error", description: message, variant: "destructive" });
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [getAccessToken]);

  const selectWorkspace = (workspace: WorkspaceWithRole | null) => {
    setCurrentWorkspace(workspace);
    if (workspace) {
      localStorage.setItem("currentWorkspaceId", workspace.id);
    } else {
      localStorage.removeItem("currentWorkspaceId");
    }
  };

  const createWorkspace = async (name: string, description?: string) => {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    try {
      const created = await workspaceApi.createWorkspace(token, {
        name,
        description: description ?? "",
      });
      toast({ title: "Success", description: "Workspace created successfully!" });
      await loadWorkspaces();
      // Select the newly created workspace (it will be in the refreshed list)
      // The API response should include role, but if not, we add it
      const withRole: WorkspaceWithRole = { ...created, role: created.role || "owner" };
      selectWorkspace(withRole);
      return withRole;
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to create workspace");
      toast({ title: "Error", description: message, variant: "destructive" });
      throw err;
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
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    try {
      await workspaceApi.updateWorkspace(token, workspaceId, {
        name: updates.name ?? "",
        description: updates.description ?? "",
        color: updates.color ?? "",
        tags: updates.tags,
      });
      toast({ title: "Success", description: "Workspace updated successfully!" });
      await loadWorkspaces();
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to update workspace");
      toast({ title: "Error", description: message, variant: "destructive" });
      throw err;
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    const token = getAccessToken();
    if (!token) throw new Error("Not authenticated");
    try {
      await workspaceApi.deleteWorkspace(token, workspaceId);
      toast({ title: "Success", description: "Workspace deleted successfully!" });
      await loadWorkspaces();
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(
          workspaces.find((w) => w.id !== workspaceId) ?? null,
        );
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to delete workspace");
      toast({ title: "Error", description: message, variant: "destructive" });
      throw err;
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

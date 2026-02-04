import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import * as workspaceApi from "@/lib/workspace-api";
import type { MemberResponse, InvitationResponse } from "@/lib/api-types";
import { getApiErrorMessage } from "@/lib/api";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

interface MemberWithEmail extends MemberResponse {
  email?: string;
}

/** Invitations: Go API has no list endpoint yet; kept as empty for now. */
const NO_INVITATIONS: InvitationResponse[] = [];

export const useWorkspaceMembers = (workspaceId: string | null) => {
  const { getAccessToken } = useAuth();
  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>(NO_INVITATIONS);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    if (!workspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setMembers([]);
      setLoading(false);
      return;
    }
    try {
      const list = await workspaceApi.listMembers(token, workspaceId);
      setMembers(list as MemberWithEmail[]);
    } catch (err) {
      console.error("Error loading members:", err);
      toast.error(getApiErrorMessage(err, "Failed to load members"));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, getAccessToken]);

  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      setInvitations(NO_INVITATIONS);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadMembers();
    // No list invitations API yet; leave invitations empty
    setInvitations(NO_INVITATIONS);
  }, [workspaceId, loadMembers]);

  const inviteMember = async (
    email: string,
    role: WorkspaceRole = "member",
    workspaceName?: string,
  ) => {
    if (!workspaceId) return;
    const token = getAccessToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    try {
      await workspaceApi.inviteMember(token, workspaceId, {
        email: email.toLowerCase(),
        role,
      });
      toast.success(`Invitation sent to ${email}`);
      await loadMembers();
      setInvitations(NO_INVITATIONS);
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to send invitation");
      toast.error(msg);
      throw err;
    }
  };

  const cancelInvitation = async (_invitationId: string) => {
    // No DELETE invitation endpoint in Go API yet
    toast.info("Cancel invitation is not available yet");
  };

  const updateMemberRole = async (memberId: string, newRole: WorkspaceRole) => {
    if (!workspaceId) return;
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await workspaceApi.updateMemberRole(token, workspaceId, member.user_id, newRole);
      toast.success("Member role updated");
      await loadMembers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update role"));
      throw err;
    }
  };

  const removeMember = async (memberId: string) => {
    if (!workspaceId) return;
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await workspaceApi.removeMember(token, workspaceId, member.user_id);
      toast.success("Member removed from workspace");
      await loadMembers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to remove member"));
      throw err;
    }
  };

  return {
    members,
    invitations,
    loading,
    inviteMember,
    cancelInvitation,
    updateMemberRole,
    removeMember,
    refreshMembers: loadMembers,
  };
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"];
type WorkspaceInvitation =
  Database["public"]["Tables"]["workspace_invitations"]["Row"];
type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

interface MemberWithEmail extends WorkspaceMember {
  email?: string;
}

export const useWorkspaceMembers = (workspaceId: string | null) => {
  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    loadMembers();
    loadInvitations();

    // Subscribe to member changes
    const channel = supabase
      .channel(`workspace-members-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_members",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => loadMembers(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_invitations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => loadInvitations(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const loadMembers = async () => {
    if (!workspaceId) return;

    try {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    if (!workspaceId) return;

    try {
      const { data, error } = await supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error loading invitations:", error);
    }
  };

  const inviteMember = async (
    email: string,
    role: WorkspaceRole = "member",
    workspaceName?: string,
  ) => {
    if (!workspaceId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the invitation
      const { data: invitation, error } = await supabase
        .from("workspace_invitations")
        .insert({
          workspace_id: workspaceId,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("This email has already been invited");
          return;
        }
        throw error;
      }

      // Send email notification
      try {
        const { error: emailError } = await supabase.functions.invoke(
          "send-workspace-invitation",
          {
            body: {
              email: email.toLowerCase(),
              workspaceName: workspaceName || "a workspace",
              inviterName: user.email || "A team member",
              token: invitation.token,
              role,
            },
          },
        );

        if (emailError) {
          console.error("Failed to send invitation email:", emailError);
          toast.warning("Invitation created but email notification failed");
        } else {
          toast.success(`Invitation sent to ${email}`);
        }
      } catch (emailErr) {
        console.error("Email service error:", emailErr);
        toast.success(
          `Invitation created for ${email} (email notification may have failed)`,
        );
      }

      await loadInvitations();
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to send invitation");
      throw error;
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("workspace_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation cancelled");
      await loadInvitations();
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
      throw error;
    }
  };

  const updateMemberRole = async (memberId: string, newRole: WorkspaceRole) => {
    try {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member role updated");
      await loadMembers();
    } catch (error) {
      console.error("Error updating member role:", error);
      toast.error("Failed to update member role");
      throw error;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed from workspace");
      await loadMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
      throw error;
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

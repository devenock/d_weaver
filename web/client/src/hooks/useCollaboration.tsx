import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CollaboratorPresence {
  user_id: string;
  cursor_position: any;
  last_seen: string;
}

export const useCollaboration = (diagramId: string | null) => {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>(
    [],
  );
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!diagramId) return;

    const setupCollaboration = async () => {
      // Subscribe to collaboration_sessions changes
      const collaborationChannel = supabase
        .channel(`diagram-${diagramId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "collaboration_sessions",
            filter: `diagram_id=eq.${diagramId}`,
          },
          (payload) => {
            console.log("Collaboration change:", payload);
            fetchCollaborators();
          },
        )
        .subscribe();

      setChannel(collaborationChannel);

      // Fetch initial collaborators
      await fetchCollaborators();
    };

    const fetchCollaborators = async () => {
      const { data, error } = await supabase
        .from("collaboration_sessions")
        .select("*")
        .eq("diagram_id", diagramId)
        .gt("last_seen", new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Active in last 5 minutes

      if (error) {
        console.error("Error fetching collaborators:", error);
        return;
      }

      setCollaborators(
        (data || [])
          .filter((c) => c.user_id !== null)
          .map((c) => ({
            user_id: c.user_id!,
            cursor_position: c.cursor_position,
            last_seen: c.last_seen,
          }))
      );
    };

    setupCollaboration();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [diagramId]);

  const joinCollaboration = async () => {
    if (!diagramId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("collaboration_sessions").upsert({
      diagram_id: diagramId,
      user_id: user.id,
      last_seen: new Date().toISOString(),
    });

    if (error) {
      console.error("Error joining collaboration:", error);
      toast.error("Failed to join collaboration");
    }
  };

  const leaveCollaboration = async () => {
    if (!diagramId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("collaboration_sessions")
      .delete()
      .eq("diagram_id", diagramId)
      .eq("user_id", user.id);
  };

  const updatePresence = async (cursorPosition: any) => {
    if (!diagramId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("collaboration_sessions").upsert({
      diagram_id: diagramId,
      user_id: user.id,
      cursor_position: cursorPosition,
      last_seen: new Date().toISOString(),
    });
  };

  return {
    collaborators,
    joinCollaboration,
    leaveCollaboration,
    updatePresence,
  };
};

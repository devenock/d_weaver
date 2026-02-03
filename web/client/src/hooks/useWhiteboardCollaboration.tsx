import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Minimal user shape for collaboration (id required). */
export interface CollaborationUser {
  id: string;
  email?: string;
}

interface CursorPosition {
  x: number;
  y: number;
}

interface CollaboratorPresence {
  id: string;
  user_id: string;
  email?: string;
  cursor: CursorPosition | null;
  color: string;
  online_at: string;
}

// Assign unique colors to collaborators
const COLLABORATOR_COLORS = [
  "#EF4444",
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#8B5CF6",
  "#06B6D4",
];

export function useWhiteboardCollaboration(
  whiteboardId: string | null,
  user: CollaborationUser | null,
) {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>(
    [],
  );
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Removed unused _colorIndexRef

  const getColorForUser = useCallback((userId: string) => {
    const index = userId.charCodeAt(0) % COLLABORATOR_COLORS.length;
    return COLLABORATOR_COLORS[index];
  }, []);

  useEffect(() => {
    if (!whiteboardId || !user) return;

    const roomId = `whiteboard-${whiteboardId}`;

    const channel = supabase.channel(roomId, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const newCollaborators: CollaboratorPresence[] = [];

        Object.entries(presenceState).forEach(([key, presences]) => {
          const presence = (presences as any[])[0];
          if (presence && key !== user.id) {
            newCollaborators.push({
              id: key,
              user_id: presence.user_id,
              email: presence.email,
              cursor: presence.cursor,
              color: getColorForUser(presence.user_id),
              online_at: presence.online_at,
            });
          }
        });

        setCollaborators(newCollaborators);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          await channel.track({
            user_id: user.id,
            email: user.email,
            cursor: null,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [whiteboardId, user, getColorForUser]);

  const updateCursor = useCallback(
    async (position: CursorPosition | null) => {
      if (!channelRef.current || !user) return;

      await channelRef.current.track({
        user_id: user.id,
        email: user.email,
        cursor: position,
        online_at: new Date().toISOString(),
      });
    },
    [user],
  );

  const broadcastCanvasChange = useCallback(async (change: any) => {
    if (!channelRef.current) return;

    await channelRef.current.send({
      type: "broadcast",
      event: "canvas_change",
      payload: change,
    });
  }, []);

  const onCanvasChange = useCallback((callback: (change: any) => void) => {
    if (!channelRef.current) return () => {};

    channelRef.current.on(
      "broadcast",
      { event: "canvas_change" },
      ({ payload }) => {
        callback(payload);
      },
    );

    return () => {
      // Cleanup handled by channel unsubscribe
    };
  }, []);

  return {
    collaborators,
    isConnected,
    updateCursor,
    broadcastCanvasChange,
    onCanvasChange,
  };
}

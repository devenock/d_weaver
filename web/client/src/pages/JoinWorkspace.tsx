import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const JoinWorkspace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "auth-required"
  >("loading");
  const [message, setMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link");
      return;
    }

    handleJoin();
  }, [token]);

  const handleJoin = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("auth-required");
        setMessage("Please sign in to join this workspace");
        return;
      }

      // Find the invitation
      const { data: invitation, error: inviteError } = await supabase
        .from("workspace_invitations")
        .select("*, workspaces(name)")
        .eq("token", token || "")
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !invitation) {
        setStatus("error");
        setMessage("This invitation is invalid or has expired");
        return;
      }

      // Check if user email matches
      if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
        setStatus("error");
        setMessage("This invitation was sent to a different email address");
        return;
      }

      // Add user to workspace
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
        });

      if (memberError) {
        if (memberError.code === "23505") {
          setStatus("success");
          setWorkspaceName(
            (invitation as any).workspaces?.name || "the workspace",
          );
          setMessage("You're already a member of this workspace!");
        } else {
          throw memberError;
        }
      } else {
        // Delete the invitation
        await supabase
          .from("workspace_invitations")
          .delete()
          .eq("id", invitation.id);

        setStatus("success");
        setWorkspaceName(
          (invitation as any).workspaces?.name || "the workspace",
        );
        setMessage("You've successfully joined the workspace!");

        toast.success("Welcome to the workspace!");
      }
    } catch (error) {
      console.error("Error joining workspace:", error);
      setStatus("error");
      setMessage("Failed to join workspace. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>
              {status === "loading" && "Joining Workspace..."}
              {status === "success" && "Welcome!"}
              {status === "error" && "Unable to Join"}
              {status === "auth-required" && "Sign In Required"}
            </CardTitle>
            <CardDescription>
              {status === "success" && workspaceName}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-center text-muted-foreground">{message}</p>
                <Button onClick={() => navigate("/gallery")} className="mt-4">
                  Go to My Diagrams
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-center text-muted-foreground">{message}</p>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  className="mt-4"
                >
                  Go Home
                </Button>
              </>
            )}

            {status === "auth-required" && (
              <>
                <p className="text-center text-muted-foreground">{message}</p>
                <Button
                  onClick={() =>
                    navigate(
                      `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`,
                    )
                  }
                  className="mt-4"
                >
                  Sign In
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinWorkspace;

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { acceptInvitation } from "@/lib/workspace-api";
import { getApiErrorMessage } from "@/lib/api";
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

export default function JoinWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { user, loading: authLoading, getAccessToken } = useAuth();

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "auth-required"
  >("loading");
  const [message, setMessage] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link");
      return;
    }
    if (authLoading) return;

    if (!user) {
      setStatus("auth-required");
      setMessage("Sign up or log in to join this workspace. If you don't have an account, create one first—then you'll be added to the workspace.");
      return;
    }

    let cancelled = false;
    const run = async () => {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setStatus("auth-required");
        setMessage("Please sign in to join this workspace.");
        return;
      }
      setStatus("loading");
      try {
        const workspace = await acceptInvitation(accessToken, token);
        if (cancelled) return;
        setWorkspaceId(workspace.id);
        setStatus("success");
        toast.success("Welcome to the workspace!");
        navigate("/dashboard", { state: { selectWorkspaceId: workspace.id }, replace: true });
      } catch (err) {
        if (cancelled) return;
        setMessage(getApiErrorMessage(err, "Failed to join workspace"));
        setStatus("error");
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token, authLoading, user, getAccessToken, navigate, toast]);

  const joinRedirect = `/join${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(joinRedirect)}`;
  const signupUrl = `/signup?redirect=${encodeURIComponent(joinRedirect)}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>
              {status === "loading" && "Joining workspace..."}
              {status === "success" && "Welcome!"}
              {status === "error" && "Unable to join"}
              {status === "auth-required" && "Sign in or sign up"}
            </CardTitle>
            <CardDescription>
              {status === "auth-required" && "You need an account to join this workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}

            {status === "success" && !workspaceId && (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-center text-muted-foreground">{message || "You've joined the workspace."}</p>
                <Button onClick={() => navigate("/dashboard")} className="mt-4">
                  Go to dashboard
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
                  Go home
                </Button>
              </>
            )}

            {status === "auth-required" && (
              <>
                <p className="text-center text-muted-foreground">{message}</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full sm:w-auto">
                  <Button asChild>
                    <a href={signupUrl}>Create account</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={loginUrl}>Sign in</a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Use the same email this invitation was sent to.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

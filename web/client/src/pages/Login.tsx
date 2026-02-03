import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, ApiError } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Chrome, Lock } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const redirectTo = useMemo(() => {
    const r = searchParams.get("redirect");
    return r && r.startsWith("/") ? r : "/dashboard";
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [authLoading, isAuthenticated, navigate, redirectTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.body.message : "Sign in failed";
      toast({
        title: "Sign in failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      sideTitle="Welcome back."
      sideSubtitle="Pick up where you left off—manage diagrams, workspaces, and exports from your dashboard."
    >
      <div className="rounded-2xl border bg-background/70 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Continue to your workspace and keep building.
          </p>
        </div>

        {/* Social (design-only) */}
        <div className="mt-6 grid gap-3">
          <Button type="button" variant="outline" className="h-11 justify-center gap-2">
            <Chrome className="h-4 w-4" />
            Continue with Google
          </Button>
          <Button type="button" variant="outline" className="h-11 justify-center gap-2">
            <Lock className="h-4 w-4" />
            Continue with SSO
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <div className="text-xs text-muted-foreground">or</div>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-11"
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Signing in..." : "Continue"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

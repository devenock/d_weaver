import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/auth-api";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({
        title: "Passwords don't match",
        description: "Please enter the same password in both fields.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      toast({
        title: "Password reset",
        description: "You can now sign in with your new password.",
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.body.message : "Reset failed. The link may have expired.";
      toast({
        title: "Reset failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        sideTitle="Invalid reset link."
        sideSubtitle="Password reset links are sent by email. Request a new one from the sign in page."
      >
        <div className="rounded-2xl border bg-background/70 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:p-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Missing or invalid link
            </h1>
            <p className="text-sm text-muted-foreground">
              This reset link is invalid or has expired. Please request a new
              password reset from the sign in page.
            </p>
          </div>
          <div className="mt-6">
            <Button asChild className="h-11 w-full gap-2" variant="default">
              <Link to="/forgot-password">Request new reset link</Link>
            </Button>
          </div>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell
        sideTitle="You're all set."
        sideSubtitle="Your password has been updated. Sign in to continue."
      >
        <div className="rounded-2xl border bg-background/70 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:p-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Password updated
            </h1>
            <p className="text-sm text-muted-foreground">
              You can now sign in with your new password.
            </p>
          </div>
          <div className="mt-6">
            <Button asChild className="h-11 w-full" variant="default">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      sideTitle="Set a new password."
      sideSubtitle="Choose a strong password that you don't use elsewhere."
    >
      <div className="rounded-2xl border bg-background/70 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            New password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below. Use at least 8 characters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            className="h-11 w-full gap-2"
            disabled={loading}
          >
            <Lock className="h-4 w-4" />
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

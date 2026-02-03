import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";
import { forgotPassword } from "@/lib/auth-api";
import { Mail } from "lucide-react";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSent(false);

    try {
      await forgotPassword(email);
      setSent(true);
      toast({
        title: "Check your email",
        description:
          "If an account exists with this email, you'll receive instructions to reset your password.",
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.body.message : "Request failed. Try again.";
      toast({
        title: "Something went wrong",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      sideTitle="Reset your password."
      sideSubtitle="Enter your email and we'll send you a link to set a new password."
    >
      <div className="rounded-2xl border bg-background/70 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Forgot password?
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the email address for your account and we'll send you a link to
            reset your password.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            If an account exists with <strong className="text-foreground">{email}</strong>,
            you'll receive an email with a link to set a new password. The link may
            take a few minutes to arrive.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

            <Button
              type="submit"
              className="h-11 w-full gap-2"
              disabled={loading}
            >
              <Mail className="h-4 w-4" />
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

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

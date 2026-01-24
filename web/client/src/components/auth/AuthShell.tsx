import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Users, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  /** Right side (the actual form) */
  children: React.ReactNode;
  /** Left marketing panel title */
  sideTitle: string;
  /** Left marketing panel subtitle */
  sideSubtitle: string;
  /** Optional extra content under subtitle */
  sideFooter?: React.ReactNode;
  /** Optional className */
  className?: string;
};

export function AuthShell({
  children,
  sideTitle,
  sideSubtitle,
  sideFooter,
  className,
}: AuthShellProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left panel (reference-style split layout) */}
        <div className="relative hidden overflow-hidden border-r bg-muted/30 lg:flex">
          <div className="absolute inset-0">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/0 to-background/50" />
          </div>

          <div className="relative flex w-full flex-col justify-between p-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                DiagramGen
              </span>
            </Link>

            <div className="space-y-6">
              <h2 className="text-3xl font-bold leading-tight">{sideTitle}</h2>
              <p className="max-w-md text-muted-foreground">{sideSubtitle}</p>

              <div className="mt-8 grid max-w-md gap-3 text-sm">
                <div className="flex items-start gap-3 rounded-lg border bg-background/50 p-3">
                  <Zap className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Fast to start</div>
                    <div className="text-muted-foreground">
                      Jump into diagrams with clean defaults and smart tools.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-background/50 p-3">
                  <Users className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium">Team-friendly</div>
                    <div className="text-muted-foreground">
                      Organize workspaces and collaborate without friction.
                    </div>
                  </div>
                </div>
              </div>

              {sideFooter}
            </div>

            <div className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} DiagramGen
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3 lg:px-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-10 lg:px-8">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


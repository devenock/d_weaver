import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  /** Right side (the actual form) */
  children: React.ReactNode;
  /** Left marketing panel title */
  sideTitle: string;
  /** Left marketing panel subtitle */
  sideSubtitle: string;
  /** Optional className */
  className?: string;
};

export function AuthShell({
  children,
  sideTitle,
  sideSubtitle,
  className,
}: AuthShellProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left panel (strong visual, reference-inspired) */}
        <div className="relative hidden overflow-hidden border-r lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-muted/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.25),transparent_55%)]" />
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:64px_64px]" />

          <div className="relative flex w-full flex-col p-10">
            <div className="flex items-center justify-between">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  DiagramGen
                </span>
              </Link>
            </div>

            <div className="mt-16 space-y-6">
              <h2 className="text-4xl font-semibold leading-tight tracking-tight">
                {sideTitle}
              </h2>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                {sideSubtitle}
              </p>

              <div className="mt-8 grid gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="text-muted-foreground">
                    Clean defaults with a modern, consistent design system.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="text-muted-foreground">
                    Workspaces and sharing built around real collaboration.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div className="text-muted-foreground">
                    Export-ready diagrams (PNG/SVG/PDF) when you need them.
                  </div>
                </div>
              </div>
            </div>

            {/* Showcase card (visual weight like your references) */}
            <div className="mt-10 max-w-xl">
              <div className="rounded-2xl border bg-background/60 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Recent work</div>
                  <div className="text-xs text-muted-foreground">Updated moments ago</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {["Architecture", "Flows", "Whiteboards"].map((label) => (
                    <div
                      key={label}
                      className="rounded-xl border bg-muted/20 p-3"
                    >
                      <div className="h-12 rounded-lg bg-gradient-to-br from-primary/25 to-primary/0" />
                      <div className="mt-2 text-xs font-medium">{label}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Ready to share
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-10 text-xs text-muted-foreground">
              © {new Date().getFullYear()} DiagramGen
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 lg:px-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-6 lg:px-10">
            <div className="w-full max-w-[440px]">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


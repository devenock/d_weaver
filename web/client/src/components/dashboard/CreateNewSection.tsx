import { FileText, Pencil, Grid3X3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CreateNewSectionProps {
  onNewDiagram: () => void;
  onNewWhiteboard: () => void;
  onFromTemplate: () => void;
  onGenerateWithAI: () => void;
  className?: string;
}

const actions = [
  {
    id: "diagram",
    label: "Blank diagram",
    description: "Start from an empty canvas",
    icon: FileText,
    onClickKey: "onNewDiagram" as const,
    primary: true,
  },
  {
    id: "whiteboard",
    label: "Blank whiteboard",
    description: "Freeform ideas and mind maps",
    icon: Pencil,
    onClickKey: "onNewWhiteboard" as const,
    primary: false,
  },
  {
    id: "template",
    label: "From template",
    description: "Flowcharts, UML, architecture",
    icon: Grid3X3,
    onClickKey: "onFromTemplate" as const,
    primary: false,
  },
  {
    id: "ai",
    label: "Generate with AI",
    description: "Describe it, we draw it",
    icon: Sparkles,
    onClickKey: "onGenerateWithAI" as const,
    primary: false,
  },
];

export function CreateNewSection({
  onNewDiagram,
  onNewWhiteboard,
  onFromTemplate,
  onGenerateWithAI,
  className,
}: CreateNewSectionProps) {
  const handlers = {
    onNewDiagram,
    onNewWhiteboard,
    onFromTemplate,
    onGenerateWithAI,
  };

  return (
    <section className={cn("mb-10", className)}>
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Create new
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((item) => {
          const Icon = item.icon;
          const onClick = handlers[item.onClickKey];
          return (
            <button
              key={item.id}
              type="button"
              onClick={onClick}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-200",
                "hover:border-primary/50 hover:shadow-md hover:bg-card/80",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                item.primary && "md:col-span-1 border-primary/30 bg-primary/5 hover:bg-primary/10"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  item.primary
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground truncate">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

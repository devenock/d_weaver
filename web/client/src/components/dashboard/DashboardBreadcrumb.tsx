import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { LayoutDashboard } from "lucide-react";

interface DashboardBreadcrumbProps {
  workspaceName: string;
  viewMode: "dashboard" | "editor" | "whiteboard";
  diagramTitle?: string | null;
  onNavigateToDashboard?: () => void;
}

export function DashboardBreadcrumb({
  workspaceName,
  viewMode,
  diagramTitle,
  onNavigateToDashboard,
}: DashboardBreadcrumbProps) {
  const isInEditor = viewMode === "editor" || viewMode === "whiteboard";
  const currentLabel = isInEditor && diagramTitle
    ? diagramTitle
    : "Your Diagrams";

  return (
    <Breadcrumb className="flex-shrink-0">
      <BreadcrumbList>
        <BreadcrumbItem>
          {isInEditor && onNavigateToDashboard ? (
            <BreadcrumbLink
              onClick={(e) => {
                e.preventDefault();
                onNavigateToDashboard();
              }}
              className="cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="flex items-center gap-1.5 font-medium text-foreground">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-normal text-muted-foreground">
            {workspaceName}
          </BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="font-normal text-foreground truncate max-w-[180px] sm:max-w-[240px]" title={currentLabel}>
            {currentLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

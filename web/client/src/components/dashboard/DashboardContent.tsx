import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download, Share2, Trash2, Eye, Edit, MoreHorizontal } from "lucide-react";
import { CreateNewSection } from "@/components/dashboard/CreateNewSection";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DiagramResponse } from "@/lib/api-types";
import { deleteDiagram, updateDiagram } from "@/lib/diagram-api";
import { resolveImageUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";

interface DashboardContentProps {
  accessToken: string;
  diagrams: DiagramResponse[];
  loading: boolean;
  onDiagramClick: (diagram: DiagramResponse) => void;
  onNewDiagram: () => void;
  onNewWhiteboard?: () => void;
  onOpenTemplates?: () => void;
  onOpenAIGenerate?: () => void;
  onRefresh: () => void;
}

export function DashboardContent({
  accessToken,
  diagrams,
  loading,
  onDiagramClick,
  onNewDiagram,
  onNewWhiteboard,
  onOpenTemplates,
  onOpenAIGenerate,
  onRefresh,
}: DashboardContentProps) {
  const { toast } = useToast();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDiagram(accessToken, id);
      toast({ title: "Success", description: "Diagram deleted successfully" });
      onRefresh();
    } catch (err) {
      toast({ title: "Error", description: getApiErrorMessage(err, "Failed to delete diagram"), variant: "destructive" });
    }
  };

  const handleShare = async (diagram: DiagramResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDiagram(accessToken, diagram.id, {
        title: diagram.title,
        content: diagram.content,
        diagram_type: diagram.diagram_type,
        is_public: true,
      });
      const shareUrl = `${window.location.origin}/diagram/${diagram.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Share link copied!",
        description: "The diagram is now public and the link has been copied.",
      });
      onRefresh();
    } catch (err) {
      toast({ title: "Error", description: getApiErrorMessage(err, "Failed to share diagram"), variant: "destructive" });
    }
  };

  const handleDownload = async (diagram: DiagramResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    const imageUrl = resolveImageUrl(diagram.image_url);
    if (!imageUrl) {
      toast({ title: "Error", description: "No image available", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(imageUrl, { credentials: "include" });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${diagram.title}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Diagram downloaded successfully" });
    } catch (err) {
      toast({ title: "Error", description: getApiErrorMessage(err, "Failed to download diagram"), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <p className="text-center text-muted-foreground">Loading diagrams...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Create New - primary entry point */}
      <CreateNewSection
        onNewDiagram={onNewDiagram}
        onNewWhiteboard={onNewWhiteboard ?? (() => {})}
        onFromTemplate={onOpenTemplates ?? (() => {})}
        onGenerateWithAI={onOpenAIGenerate ?? (() => {})}
      />

      {/* Your content */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Diagrams</h1>
          <p className="text-muted-foreground">Create, manage, and share your diagrams</p>
        </div>
        <Button onClick={onNewDiagram} className="gap-2">
          <Plus className="h-4 w-4" />
          New Diagram
        </Button>
      </div>

      {/* Diagrams Grid */}
      {diagrams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">No diagrams yet. Create your first one!</p>
            <Button onClick={onNewDiagram}>Create a Diagram</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {diagrams.map((diagram) => (
            <Card
              key={diagram.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50"
              onClick={() => onDiagramClick(diagram)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{diagram.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {diagram.diagram_type} • {new Date(diagram.updated_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDiagramClick(diagram); }}>
                        {diagram.diagram_type === "whiteboard" ? (
                          <>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDownload(diagram, e)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleShare(diagram, e)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(diagram.id, e)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="bg-muted rounded-md h-32 overflow-hidden flex items-center justify-center">
                  {resolveImageUrl(diagram.image_url) ? (
                    <img
                      src={resolveImageUrl(diagram.image_url)!}
                      alt={diagram.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">No preview</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

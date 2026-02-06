import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download, Share2, Trash2, Eye, Edit, MoreHorizontal, Clock } from "lucide-react";
import { CreateNewSection } from "@/components/dashboard/CreateNewSection";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { DiagramResponse } from "@/lib/api-types";
import { deleteDiagram, updateDiagram, getDiagram } from "@/lib/diagram-api";
import { resolveImageUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api";
import mermaid from "mermaid";

interface DashboardContentProps {
  accessToken: string;
  diagrams: DiagramResponse[];
  recentDiagrams?: DiagramResponse[];
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
  recentDiagrams = [],
  loading,
  onDiagramClick,
  onNewDiagram,
  onNewWhiteboard,
  onOpenTemplates,
  onOpenAIGenerate,
  onRefresh,
}: DashboardContentProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"recent" | "all">("recent");
  const [filterType, setFilterType] = useState<"all" | "diagrams" | "whiteboards">("all");
  const [sortBy, setSortBy] = useState<"updated-desc" | "updated-asc" | "name-asc" | "name-desc">("updated-desc");

  // Source list for current tab (before filter/sort)
  const sourceList = activeTab === "recent" && recentDiagrams.length > 0 ? recentDiagrams : diagrams;

  // Filter and sort the list
  const filteredAndSortedDiagrams = useMemo(() => {
    let list = [...sourceList];
    if (filterType === "diagrams") {
      list = list.filter((d) => d.diagram_type !== "whiteboard");
    } else if (filterType === "whiteboards") {
      list = list.filter((d) => d.diagram_type === "whiteboard");
    }
    if (sortBy === "updated-desc") {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else if (sortBy === "updated-asc") {
      list.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    } else {
      list.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: "base" }));
    }
    return list;
  }, [sourceList, filterType, sortBy]);

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

  // Component to render diagram preview (image or mermaid fallback)
  const DiagramPreview = ({ diagram }: { diagram: DiagramResponse }) => {
    const [mermaidSvg, setMermaidSvg] = useState<string | null>(null);
    const [isMermaid, setIsMermaid] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const checkAndRenderMermaid = async () => {
        // Only check for mermaid if no image_url
        if (resolveImageUrl(diagram.image_url)) {
          setIsMermaid(false);
          return;
        }

        // Try to get diagram content to check if it's mermaid
        try {
          const data = await getDiagram(accessToken, diagram.id);
          const trimmed = String(data.content || "").trim();
          const isMermaidCode = trimmed.length > 0 && (
            trimmed.startsWith('graph ') ||
            trimmed.startsWith('flowchart ') ||
            trimmed.startsWith('sequenceDiagram') ||
            trimmed.startsWith('erDiagram') ||
            trimmed.startsWith('gantt') ||
            trimmed.startsWith('stateDiagram') ||
            trimmed.startsWith('C4Context') ||
            trimmed.startsWith('mindmap') ||
            trimmed.includes('-->') ||
            trimmed.includes('->>') ||
            (trimmed.includes('subgraph') && trimmed.includes('end'))
          );

          if (isMermaidCode) {
            setIsMermaid(true);
            setLoading(true);
            try {
              const renderId = `preview-${diagram.id}-${Math.random().toString(36).slice(2, 9)}`;
              mermaid.initialize({
                startOnLoad: false,
                securityLevel: "loose",
                theme: "base",
                themeVariables: {
                  primaryColor: "#6366f1",
                  primaryTextColor: "#fff",
                  primaryBorderColor: "#4f46e5",
                  lineColor: "#64748b",
                  background: "#f8fafc",
                },
              });
              const { svg } = await mermaid.render(renderId, trimmed);
              setMermaidSvg(svg);
            } catch (err) {
              console.error("Failed to render mermaid preview:", err);
              setIsMermaid(false);
            } finally {
              setLoading(false);
            }
          } else {
            setIsMermaid(false);
          }
        } catch (err) {
          // If we can't load the diagram, just show "No preview"
          setIsMermaid(false);
        }
      };

      checkAndRenderMermaid();
    }, [diagram.id, diagram.image_url, accessToken]);

    if (resolveImageUrl(diagram.image_url)) {
      return (
        <img
          src={resolveImageUrl(diagram.image_url)!}
          alt={diagram.title}
          className="max-w-full max-h-full object-contain"
        />
      );
    }

    if (isMermaid && mermaidSvg) {
      return (
        <div
          className="w-full h-full flex items-center justify-center p-2 bg-[#f8fafc]"
          dangerouslySetInnerHTML={{ __html: mermaidSvg }}
          style={{ fontSize: '10px' }}
        />
      );
    }

    if (loading) {
      return <p className="text-xs text-muted-foreground animate-pulse">Loading preview...</p>;
    }

    return <p className="text-xs text-muted-foreground">No preview</p>;
  };

  const renderDiagramGrid = (diagramsToRender: DiagramResponse[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {diagramsToRender.map((diagram) => (
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
                  <DiagramPreview diagram={diagram} />
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  );

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Create New - primary entry point */}
      <CreateNewSection
        onNewDiagram={onNewDiagram}
        onNewWhiteboard={onNewWhiteboard ?? (() => {})}
        onFromTemplate={onOpenTemplates ?? (() => {})}
        onGenerateWithAI={onOpenAIGenerate ?? (() => {})}
      />

      {/* View switcher and content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "recent" | "all")} className="w-full">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Your Diagrams</h1>
              <p className="text-muted-foreground">Create, manage, and share your diagrams</p>
            </div>
            {diagrams.length > 0 ? (
              <div className="flex items-center gap-4">
                <TabsList>
                  <TabsTrigger value="recent" className="gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                <Button onClick={onNewDiagram} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Diagram
                </Button>
              </div>
            ) : (
              <TabsList>
                <TabsTrigger value="recent" className="gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Recent
                </TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            )}
          </div>
          {sourceList.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="diagrams">Diagrams</SelectItem>
                  <SelectItem value="whiteboards">Whiteboards</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[200px] h-9 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated-desc">Last updated (newest)</SelectItem>
                  <SelectItem value="updated-asc">Last updated (oldest)</SelectItem>
                  <SelectItem value="name-asc">Name A–Z</SelectItem>
                  <SelectItem value="name-desc">Name Z–A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="recent" className="mt-0">
          {recentDiagrams.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No recent diagrams</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {diagrams.length > 0 
                    ? "Start working on a diagram to see it here" 
                    : "Create your first diagram to get started"}
                </p>
                {diagrams.length === 0 && (
                  <Button onClick={onNewDiagram}>Create a Diagram</Button>
                )}
              </CardContent>
            </Card>
          ) : filteredAndSortedDiagrams.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No items match the current filter.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilterType("all")}>
                  Clear filter
                </Button>
              </CardContent>
            </Card>
          ) : (
            renderDiagramGrid(filteredAndSortedDiagrams)
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-0">
          {diagrams.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground mb-4">No diagrams yet. Create your first one!</p>
                <Button onClick={onNewDiagram}>Create a Diagram</Button>
              </CardContent>
            </Card>
          ) : filteredAndSortedDiagrams.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No items match the current filter.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilterType("all")}>
                  Clear filter
                </Button>
              </CardContent>
            </Card>
          ) : (
            renderDiagramGrid(filteredAndSortedDiagrams)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

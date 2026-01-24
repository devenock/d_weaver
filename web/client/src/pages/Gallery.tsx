import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import {
  Download,
  Share2,
  Trash2,
  Eye,
  Edit,
  Github,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import { ExportEmbedDialog } from "@/components/ExportEmbedDialog";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { CreateWorkspaceDialog } from "@/components/workspace/CreateWorkspaceDialog";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Diagram = Tables<"diagrams">;

const Gallery = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("personal");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    workspaces,
    currentWorkspace,
    loading: workspacesLoading,
  } = useWorkspaces();

  const filteredDiagrams = useMemo(() => {
    if (!searchQuery.trim()) return diagrams;
    const query = searchQuery.toLowerCase();
    return diagrams.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.diagram_type.toLowerCase().includes(query),
    );
  }, [diagrams, searchQuery]);

  useEffect(() => {
    checkAuthAndLoadDiagrams();
  }, []);

  useEffect(() => {
    if (!workspacesLoading) {
      loadDiagrams();
    }
  }, [currentWorkspace, activeTab, workspacesLoading]);

  const checkAuthAndLoadDiagrams = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login", { replace: true });
      return;
    }

    loadDiagrams();
  };

  const loadDiagrams = async () => {
    try {
      let query = supabase
        .from("diagrams")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeTab === "personal") {
        // Personal diagrams (no workspace)
        query = query.is("workspace_id", null);
      } else if (activeTab === "workspace" && currentWorkspace) {
        // Current workspace diagrams
        query = query.eq("workspace_id", currentWorkspace.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDiagrams(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("diagrams").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Diagram deleted successfully",
      });

      loadDiagrams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = async (diagram: Diagram) => {
    try {
      const { error } = await supabase
        .from("diagrams")
        .update({ is_public: true })
        .eq("id", diagram.id);

      if (error) throw error;

      const shareUrl = `${window.location.origin}/diagram/${diagram.id}`;
      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: "Share link copied!",
        description:
          "The diagram is now public and the link has been copied to clipboard.",
      });

      loadDiagrams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (diagram: Diagram) => {
    if (!diagram.image_url) {
      toast({
        title: "Error",
        description: "No image available for this diagram",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(diagram.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${diagram.title}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Diagram downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download diagram",
        variant: "destructive",
      });
    }
  };

  const handleExportEmbed = (diagram: Diagram) => {
    if (!diagram.image_url) {
      toast({
        title: "Error",
        description: "No image available for this diagram",
        variant: "destructive",
      });
      return;
    }
    setSelectedDiagram(diagram);
    setExportDialogOpen(true);
  };

  // Removed unused _handleMoveToWorkspace

  if (loading || workspacesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <p className="text-center text-muted-foreground">
            Loading your diagrams...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Diagrams</h1>
          <p className="text-muted-foreground">
            View, download, and share your saved diagrams
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="personal" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Personal
              </TabsTrigger>
              {workspaces.map((ws) => (
                <TabsTrigger key={ws.id} value={ws.id} className="gap-2">
                  {ws.name}
                  <Badge variant="outline" className="ml-1 text-xs capitalize">
                    {ws.role}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateWorkspaceOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Workspace
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search diagrams by title or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>

          <TabsContent value="personal" className="mt-0">
            {renderDiagramGrid(filteredDiagrams, "personal")}
          </TabsContent>

          {workspaces.map((ws) => (
            <TabsContent key={ws.id} value={ws.id} className="mt-0">
              {activeTab === ws.id &&
                renderDiagramGrid(filteredDiagrams, ws.id)}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {selectedDiagram && (
        <ExportEmbedDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          imageUrl={selectedDiagram.image_url || ""}
          title={selectedDiagram.title}
        />
      )}

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
      />
    </div>
  );

  function renderDiagramGrid(diagrams: Diagram[], context: string) {
    if (diagrams.length === 0) {
      return (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">
              {context === "personal"
                ? "You haven't created any personal diagrams yet."
                : "No diagrams in this workspace yet."}
            </p>
            <Button onClick={() => navigate("/editor")}>
              Create a Diagram
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {diagrams.map((diagram) => (
          <Card key={diagram.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="truncate">{diagram.title}</CardTitle>
              <CardDescription>
                {diagram.diagram_type} •{" "}
                {new Date(diagram.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="bg-muted rounded-md mb-4 h-48 overflow-hidden flex items-center justify-center">
                {diagram.image_url ? (
                  <img
                    src={diagram.image_url}
                    alt={diagram.title}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground p-4">
                    No preview available
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {diagram.diagram_type === "whiteboard" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/whiteboard?diagramId=${diagram.id}`)
                    }
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/editor?diagramId=${diagram.id}`)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(diagram)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportEmbed(diagram)}
                  className="gap-2"
                >
                  <Github className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(diagram)}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(diagram.id)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
};

export default Gallery;

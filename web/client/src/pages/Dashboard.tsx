import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { EmbeddedEditor } from "@/components/dashboard/EmbeddedEditor";
import { EmbeddedWhiteboard } from "@/components/dashboard/EmbeddedWhiteboard";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Diagram = Tables<"diagrams">;

type ViewMode = "dashboard" | "editor" | "whiteboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");

  const {
    workspaces,
    currentWorkspace,
    loading: workspacesLoading,
    selectWorkspace,
    createWorkspace,
  } = useWorkspaces();

  // Filter diagrams and whiteboards
  const diagramsList = useMemo(
    () => diagrams.filter((d) => d.diagram_type !== "whiteboard"),
    [diagrams],
  );

  const whiteboardsList = useMemo(
    () => diagrams.filter((d) => d.diagram_type === "whiteboard"),
    [diagrams],
  );

  const recentDiagrams = useMemo(
    () =>
      [...diagrams]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 5),
    [diagrams],
  );

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
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!workspacesLoading && user) {
      loadDiagrams();
    }
  }, [currentWorkspace, workspacesLoading, user]);

  const loadDiagrams = async () => {
    try {
      let query = supabase
        .from("diagrams")
        .select("*")
        .order("updated_at", { ascending: false });

      if (currentWorkspace) {
        query = query.eq("workspace_id", currentWorkspace.id);
      } else {
        query = query.is("workspace_id", null);
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

  const handleDiagramClick = (diagram: Diagram) => {
    setSelectedDiagramId(diagram.id);
    if (diagram.diagram_type === "whiteboard") {
      setViewMode("whiteboard");
    } else {
      setViewMode("editor");
    }
  };

  const handleNewDiagram = () => {
    setSelectedDiagramId(null);
    setViewMode("editor");
  };

  const handleNewWhiteboard = () => {
    setSelectedDiagramId(null);
    setViewMode("whiteboard");
  };

  const handleCloseEditor = () => {
    setViewMode("dashboard");
    setSelectedDiagramId(null);
    loadDiagrams(); // Refresh the list
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || workspacesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          diagrams={diagramsList}
          whiteboards={whiteboardsList}
          recentDiagrams={recentDiagrams}
          onSelectWorkspace={selectWorkspace}
          onCreateWorkspace={createWorkspace}
          onDiagramClick={handleDiagramClick}
          onNewDiagram={handleNewDiagram}
          onNewWhiteboard={handleNewWhiteboard}
          onDiagramsClick={handleNewDiagram}
          onWhiteboardsClick={handleNewWhiteboard}
          selectedDiagramId={selectedDiagramId}
        />
        <SidebarInset className="flex flex-col">
          {/* Always show header */}
          <DashboardHeader
            user={user}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSignOut={handleSignOut}
          />

          {viewMode === "dashboard" && (
            <DashboardContent
              diagrams={filteredDiagrams}
              loading={loading}
              onDiagramClick={handleDiagramClick}
              onNewDiagram={handleNewDiagram}
              onRefresh={loadDiagrams}
            />
          )}

          {viewMode === "editor" && (
            <EmbeddedEditor
              diagramId={selectedDiagramId}
              user={user}
              onClose={handleCloseEditor}
              onSave={loadDiagrams}
              workspaceId={currentWorkspace?.id}
              onRequestNew={handleNewDiagram}
            />
          )}

          {viewMode === "whiteboard" && (
            <EmbeddedWhiteboard
              diagramId={selectedDiagramId}
              user={user}
              onClose={handleCloseEditor}
              onSave={loadDiagrams}
            />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;

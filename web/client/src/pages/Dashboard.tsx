import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader, type SearchScope } from "@/components/dashboard/DashboardHeader";
import { InviteTeamDialog } from "@/components/workspace/InviteTeamDialog";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { EmbeddedEditor } from "@/components/dashboard/EmbeddedEditor";
import { EmbeddedWhiteboard } from "@/components/dashboard/EmbeddedWhiteboard";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { listDiagrams, createDiagram } from "@/lib/diagram-api";
import type { DiagramResponse } from "@/lib/api-types";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api";
import TemplatesGallery from "@/components/TemplatesGallery";
import AIGenerateDialog from "@/components/AIGenerateDialog";

type ViewMode = "dashboard" | "editor" | "whiteboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading, logout, getAccessToken } = useAuth();
  const [diagrams, setDiagrams] = useState<DiagramResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("current");
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [inviteTeamOpen, setInviteTeamOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiGenerateOpen, setAIGenerateOpen] = useState(false);

  const {
    workspaces,
    currentWorkspace,
    loading: workspacesLoading,
    selectWorkspace,
    createWorkspace,
  } = useWorkspaces();

  const loadDiagrams = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const list = await listDiagrams(token);
      setDiagrams(list);
    } catch (err) {
      toast({ title: "Error", description: getApiErrorMessage(err, "Failed to load diagrams"), variant: "destructive" });
      setDiagrams([]);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, toast]);

  // Filter by current workspace (personal = null workspace_id)
  const diagramsInScope = useMemo(() => {
    if (!currentWorkspace) {
      return diagrams.filter((d) => d.workspace_id == null);
    }
    return diagrams.filter((d) => d.workspace_id === currentWorkspace.id);
  }, [diagrams, currentWorkspace]);

  const diagramsList = useMemo(
    () => diagramsInScope.filter((d) => d.diagram_type !== "whiteboard"),
    [diagramsInScope],
  );

  const whiteboardsList = useMemo(
    () => diagramsInScope.filter((d) => d.diagram_type === "whiteboard"),
    [diagramsInScope],
  );

  const recentDiagrams = useMemo(
    () =>
      [...diagramsInScope]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        .slice(0, 12), // Show up to 12 recent items in the Recent view
    [diagramsInScope],
  );

  // Source list for search based on scope
  const searchSourceList = useMemo(() => {
    return searchScope === "all" ? diagrams : diagramsInScope;
  }, [searchScope, diagrams, diagramsInScope]);

  const filteredDiagrams = useMemo(() => {
    if (!searchQuery.trim()) return searchSourceList;
    const query = searchQuery.toLowerCase();
    return searchSourceList.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.diagram_type.toLowerCase().includes(query),
    );
  }, [searchSourceList, searchQuery]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!workspacesLoading && user) {
      setLoading(true);
      loadDiagrams();
    }
  }, [currentWorkspace?.id, workspacesLoading, user, loadDiagrams]);

  const selectWorkspaceIdFromState = (location.state as { selectWorkspaceId?: string } | null)?.selectWorkspaceId;
  useEffect(() => {
    if (!selectWorkspaceIdFromState || workspaces.length === 0) return;
    const w = workspaces.find((x) => x.id === selectWorkspaceIdFromState);
    if (w) {
      selectWorkspace(w);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [selectWorkspaceIdFromState, workspaces, selectWorkspace, navigate, location.pathname]);

  const handleDiagramClick = (diagram: DiagramResponse) => {
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

  const handleTemplateSelect = async (code: string, type: string, name: string) => {
    const token = getAccessToken();
    if (!token) return;
    setTemplatesOpen(false);
    try {
      const created = await createDiagram(token, {
        title: name,
        content: code,
        diagram_type: type,
        workspace_id: currentWorkspace?.id ?? null,
      });
      setSelectedDiagramId(created.id);
      setViewMode("editor");
      loadDiagrams();
    } catch (err) {
      toast({
        title: "Error",
        description: getApiErrorMessage(err, "Failed to create diagram from template"),
        variant: "destructive",
      });
    }
  };

  const handleAIGenerated = async (diagramCode: string) => {
    const token = getAccessToken();
    if (!token) return;
    setAIGenerateOpen(false);
    try {
      const created = await createDiagram(token, {
        title: "AI Generated",
        content: diagramCode,
        diagram_type: "flowchart",
        workspace_id: currentWorkspace?.id ?? null,
      });
      setSelectedDiagramId(created.id);
      setViewMode("editor");
      loadDiagrams();
    } catch (err) {
      toast({
        title: "Error",
        description: getApiErrorMessage(err, "Failed to create diagram"),
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
          selectedDiagramId={selectedDiagramId}
        />
        <SidebarInset className="flex flex-col">
          {/* Always show header */}
          <DashboardHeader
            user={user}
            searchQuery={searchQuery}
            searchScope={searchScope}
            onSearchChange={setSearchQuery}
            onSearchScopeChange={setSearchScope}
            onSignOut={handleSignOut}
            onInviteClick={() => setInviteTeamOpen(true)}
            currentWorkspaceName={currentWorkspace?.name ?? null}
          />
          <InviteTeamDialog
            open={inviteTeamOpen}
            onOpenChange={setInviteTeamOpen}
            currentWorkspace={currentWorkspace}
          />

          {templatesOpen && (
            <TemplatesGallery
              onSelectTemplate={handleTemplateSelect}
              onClose={() => setTemplatesOpen(false)}
            />
          )}

          <AIGenerateDialog
            open={aiGenerateOpen}
            onOpenChange={setAIGenerateOpen}
            onGenerate={handleAIGenerated}
          />

          <div className="px-3 md:px-6 py-2 border-b bg-muted/30 shrink-0">
            <DashboardBreadcrumb
              workspaceName={currentWorkspace?.name ?? "Personal"}
              viewMode={viewMode}
              diagramTitle={
                selectedDiagramId
                  ? diagrams.find((d) => d.id === selectedDiagramId)?.title ?? "Untitled"
                  : null
              }
              onNavigateToDashboard={viewMode !== "dashboard" ? handleCloseEditor : undefined}
            />
          </div>

          {viewMode === "dashboard" && (
            <DashboardContent
              accessToken={getAccessToken() ?? ""}
              diagrams={filteredDiagrams}
              recentDiagrams={recentDiagrams}
              loading={loading}
              onDiagramClick={handleDiagramClick}
              onNewDiagram={handleNewDiagram}
              onNewWhiteboard={handleNewWhiteboard}
              onOpenTemplates={() => setTemplatesOpen(true)}
              onOpenAIGenerate={() => setAIGenerateOpen(true)}
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

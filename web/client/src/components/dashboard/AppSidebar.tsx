import { useState } from "react";
import { FileText, Pencil, Clock, Plus, ChevronRight, Settings, User, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { WorkspaceWithRole } from "@/hooks/useWorkspaces";
import { CreateWorkspaceDialog } from "@/components/workspace/CreateWorkspaceDialog";
import { WorkspaceSettingsDialog } from "@/components/workspace/WorkspaceSettingsDialog";
import type { DiagramResponse } from "@/lib/api-types";

interface AppSidebarProps {
  workspaces: WorkspaceWithRole[];
  currentWorkspace: WorkspaceWithRole | null;
  diagrams: DiagramResponse[];
  whiteboards: DiagramResponse[];
  recentDiagrams: DiagramResponse[];
  onSelectWorkspace: (workspace: WorkspaceWithRole | null) => void;
  onCreateWorkspace: (name: string, description?: string) => Promise<unknown>;
  onDiagramClick: (diagram: DiagramResponse) => void;
  onNewDiagram: () => void;
  onNewWhiteboard: () => void;
  onDiagramsClick?: () => void;
  onWhiteboardsClick?: () => void;
  selectedDiagramId: string | null;
}

export function AppSidebar({
  workspaces,
  currentWorkspace,
  diagrams,
  whiteboards,
  recentDiagrams,
  onSelectWorkspace,
  onCreateWorkspace: _onCreateWorkspace,
  onDiagramClick,
  onNewDiagram,
  onNewWhiteboard,
  onDiagramsClick,
  onWhiteboardsClick,
  selectedDiagramId,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [personalExpanded, setPersonalExpanded] = useState(true);
  const [workspacesExpanded, setWorkspacesExpanded] = useState(true);
  const [diagramsExpanded, setDiagramsExpanded] = useState(true);
  const [whiteboardsExpanded, setWhiteboardsExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);

  const isPersonal = currentWorkspace === null;

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="p-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:items-center">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center"
          >
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
            </div>
            <span className="text-base md:text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
              DiagramGen
            </span>
          </button>
        </SidebarHeader>

        <SidebarContent>
          <ScrollArea className="flex-1">
            {/* Personal */}
            <SidebarGroup className="group-data-[collapsible=icon]:p-2">
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                <SidebarMenuButton
                  isActive={isPersonal}
                  onClick={() => onSelectWorkspace(null)}
                  tooltip="Personal"
                  className="!w-8 !h-8"
                >
                  <User className="h-4 w-4" />
                </SidebarMenuButton>
              </div>
              <Collapsible open={personalExpanded} onOpenChange={setPersonalExpanded} className="group-data-[collapsible=icon]:hidden">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:text-foreground flex items-center gap-1 text-xs">
                    <ChevronRight className={`h-3 w-3 transition-transform ${personalExpanded ? 'rotate-90' : ''}`} />
                    <span>Personal</span>
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={isPersonal}
                          onClick={() => onSelectWorkspace(null)}
                          className="gap-2"
                        >
                          <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate">My diagrams</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Team workspaces */}
            <SidebarGroup className="group-data-[collapsible=icon]:p-2">
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                {workspaces.slice(0, 3).map((workspace) => (
                  <SidebarMenuButton
                    key={workspace.id}
                    isActive={currentWorkspace?.id === workspace.id}
                    onClick={() => onSelectWorkspace(workspace)}
                    tooltip={workspace.name}
                    className="!w-8 !h-8"
                  >
                    <div 
                      className="h-4 w-4 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: workspace.color || 'hsl(var(--primary))' }}
                    />
                  </SidebarMenuButton>
                ))}
                <SidebarMenuButton 
                  onClick={() => setCreateWorkspaceOpen(true)} 
                  tooltip="New Workspace"
                  className="!w-8 !h-8"
                >
                  <Plus className="h-4 w-4" />
                </SidebarMenuButton>
              </div>
              <Collapsible open={workspacesExpanded} onOpenChange={setWorkspacesExpanded} className="group-data-[collapsible=icon]:hidden">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:text-foreground flex items-center gap-1 text-xs">
                      <ChevronRight className={`h-3 w-3 transition-transform ${workspacesExpanded ? 'rotate-90' : ''}`} />
                      <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>Team workspaces</span>
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <SidebarGroupAction onClick={() => setCreateWorkspaceOpen(true)}>
                    <Plus className="h-4 w-4" />
                  </SidebarGroupAction>
                </div>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {workspaces.length === 0 ? (
                        <SidebarMenuItem>
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No team workspaces yet
                          </div>
                        </SidebarMenuItem>
                      ) : (
                        workspaces.map((workspace) => (
                          <SidebarMenuItem key={workspace.id}>
                            <SidebarMenuButton
                              isActive={currentWorkspace?.id === workspace.id}
                              onClick={() => onSelectWorkspace(workspace)}
                              className="justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-3 w-3 rounded-sm flex-shrink-0" 
                                  style={{ backgroundColor: workspace.color || 'hsl(var(--primary))' }}
                                />
                                <span className="truncate">{workspace.name}</span>
                              </div>
                              {currentWorkspace?.id === workspace.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWorkspaceSettingsOpen(true);
                                  }}
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                      )}
                      <SidebarMenuItem>
                        <SidebarMenuButton onClick={() => setCreateWorkspaceOpen(true)} className="text-muted-foreground">
                          <Plus className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">New Workspace</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Diagrams Section */}
            <SidebarGroup className="group-data-[collapsible=icon]:p-2">
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                <SidebarMenuButton 
                  onClick={onNewDiagram} 
                  tooltip="Diagrams"
                  className="!w-8 !h-8"
                >
                  <FileText className="h-4 w-4" />
                </SidebarMenuButton>
              </div>
              <Collapsible open={diagramsExpanded} onOpenChange={setDiagramsExpanded} className="group-data-[collapsible=icon]:hidden">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel 
                      className="cursor-pointer hover:text-foreground flex items-center gap-1 text-xs"
                      onClick={(e) => {
                        if (onDiagramsClick) {
                          e.stopPropagation();
                          onDiagramsClick();
                        }
                      }}
                    >
                      <ChevronRight className={`h-3 w-3 transition-transform ${diagramsExpanded ? 'rotate-90' : ''}`} />
                      <span>Diagrams</span>
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <SidebarGroupAction onClick={onNewDiagram}>
                    <Plus className="h-4 w-4" />
                  </SidebarGroupAction>
                </div>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {diagrams.length === 0 ? (
                        <SidebarMenuItem>
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No diagrams yet
                          </div>
                        </SidebarMenuItem>
                      ) : (
                        diagrams.slice(0, 10).map((diagram) => (
                          <SidebarMenuItem key={diagram.id}>
                            <SidebarMenuButton
                              isActive={selectedDiagramId === diagram.id}
                              onClick={() => onDiagramClick(diagram)}
                            >
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{diagram.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Whiteboards Section */}
            <SidebarGroup className="group-data-[collapsible=icon]:p-2">
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                <SidebarMenuButton 
                  onClick={onNewWhiteboard} 
                  tooltip="Whiteboards"
                  className="!w-8 !h-8"
                >
                  <Pencil className="h-4 w-4" />
                </SidebarMenuButton>
              </div>
              <Collapsible open={whiteboardsExpanded} onOpenChange={setWhiteboardsExpanded} className="group-data-[collapsible=icon]:hidden">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel 
                      className="cursor-pointer hover:text-foreground flex items-center gap-1 text-xs"
                      onClick={(e) => {
                        if (onWhiteboardsClick) {
                          e.stopPropagation();
                          onWhiteboardsClick();
                        }
                      }}
                    >
                      <ChevronRight className={`h-3 w-3 transition-transform ${whiteboardsExpanded ? 'rotate-90' : ''}`} />
                      <span>Whiteboards</span>
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <SidebarGroupAction onClick={onNewWhiteboard}>
                    <Plus className="h-4 w-4" />
                  </SidebarGroupAction>
                </div>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {whiteboards.length === 0 ? (
                        <SidebarMenuItem>
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No whiteboards yet
                          </div>
                        </SidebarMenuItem>
                      ) : (
                        whiteboards.slice(0, 10).map((whiteboard) => (
                          <SidebarMenuItem key={whiteboard.id}>
                            <SidebarMenuButton
                              isActive={selectedDiagramId === whiteboard.id}
                              onClick={() => onDiagramClick(whiteboard)}
                            >
                              <Pencil className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{whiteboard.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Recent Section */}
            <SidebarGroup className="group-data-[collapsible=icon]:p-2">
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
                <SidebarMenuButton 
                  tooltip="Recent"
                  className="!w-8 !h-8"
                >
                  <Clock className="h-4 w-4" />
                </SidebarMenuButton>
              </div>
              <Collapsible open={recentExpanded} onOpenChange={setRecentExpanded} className="group-data-[collapsible=icon]:hidden">
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:text-foreground flex items-center gap-1 text-xs">
                    <ChevronRight className={`h-3 w-3 transition-transform ${recentExpanded ? 'rotate-90' : ''}`} />
                    <span>Recent</span>
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {recentDiagrams.length === 0 ? (
                        <SidebarMenuItem>
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No recent items
                          </div>
                        </SidebarMenuItem>
                      ) : (
                        recentDiagrams.map((diagram) => (
                          <SidebarMenuItem key={diagram.id}>
                            <SidebarMenuButton
                              isActive={selectedDiagramId === diagram.id}
                              onClick={() => onDiagramClick(diagram)}
                            >
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{diagram.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="p-2 border-t border-border group-data-[collapsible=icon]:p-1">
          <div className="text-[10px] md:text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden truncate">
            {currentWorkspace ? currentWorkspace.name : "Personal"}
          </div>
        </SidebarFooter>
      </Sidebar>

      <CreateWorkspaceDialog
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onCreateWorkspace={_onCreateWorkspace}
      />

      {currentWorkspace && (
        <WorkspaceSettingsDialog
          open={workspaceSettingsOpen}
          onOpenChange={setWorkspaceSettingsOpen}
          workspace={currentWorkspace}
        />
      )}
    </>
  );
}

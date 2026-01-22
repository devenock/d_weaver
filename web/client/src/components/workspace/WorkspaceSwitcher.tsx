import * as React from "react";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { WorkspaceSettingsDialog } from "./WorkspaceSettingsDialog";
import { Badge } from "@/components/ui/badge";

const WORKSPACE_COLORS: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, selectWorkspace, loading } = useWorkspaces();
  const [open, setOpen] = React.useState(false);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredWorkspaces = React.useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const query = searchQuery.toLowerCase();
    return workspaces.filter(ws => 
      ws.name.toLowerCase().includes(query) ||
      ws.description?.toLowerCase().includes(query) ||
      ws.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [workspaces, searchQuery]);

  if (loading) {
    return (
      <Button variant="outline" className="w-[200px] justify-between" disabled>
        <span className="text-muted-foreground">Loading...</span>
      </Button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            {currentWorkspace ? (
              <div className="flex items-center gap-2 truncate">
                {currentWorkspace.color && (
                  <div className={cn("h-2 w-2 rounded-full shrink-0", WORKSPACE_COLORS[currentWorkspace.color] || "bg-muted")} />
                )}
                <span className="truncate">{currentWorkspace.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Select workspace...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search workspaces..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup heading="Workspaces">
                {filteredWorkspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    value={workspace.name}
                    onSelect={() => {
                      selectWorkspace(workspace);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex flex-col items-start gap-1 py-2"
                  >
                    <div className="flex items-center w-full">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          currentWorkspace?.id === workspace.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {workspace.color && (
                        <div className={cn("h-2 w-2 rounded-full mr-2 shrink-0", WORKSPACE_COLORS[workspace.color] || "bg-muted")} />
                      )}
                      <span className="truncate flex-1">{workspace.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground capitalize shrink-0">
                        {workspace.role}
                      </span>
                    </div>
                    {workspace.tags && workspace.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-6">
                        {workspace.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {workspace.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{workspace.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workspace
                </CommandItem>
                {currentWorkspace && (currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin') && (
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setShowSettingsDialog(true);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Workspace Settings
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {currentWorkspace && (
        <WorkspaceSettingsDialog
          workspace={currentWorkspace}
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
        />
      )}
    </>
  );
}

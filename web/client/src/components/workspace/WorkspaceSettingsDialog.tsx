import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspaces, type WorkspaceWithRole } from "@/hooks/useWorkspaces";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { Loader2, Trash2, UserPlus, X, Crown, Shield, User, Eye, Tag } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type WorkspaceRole = Database['public']['Enums']['workspace_role'];

const WORKSPACE_COLORS = [
  { name: "None", value: "" },
  { name: "Red", value: "red" },
  { name: "Orange", value: "orange" },
  { name: "Yellow", value: "yellow" },
  { name: "Green", value: "green" },
  { name: "Blue", value: "blue" },
  { name: "Purple", value: "purple" },
  { name: "Pink", value: "pink" },
];

const COLOR_CLASSES: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

interface WorkspaceSettingsDialogProps {
  workspace: WorkspaceWithRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleIcons: Record<WorkspaceRole, React.ReactNode> = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  member: <User className="h-4 w-4 text-muted-foreground" />,
  viewer: <Eye className="h-4 w-4 text-muted-foreground" />,
};

export function WorkspaceSettingsDialog({ 
  workspace, 
  open, 
  onOpenChange 
}: WorkspaceSettingsDialogProps) {
  const { updateWorkspace, deleteWorkspace } = useWorkspaces();
  const { members, invitations, inviteMember, cancelInvitation, updateMemberRole, removeMember } = useWorkspaceMembers(workspace.id);
  
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [color, setColor] = useState(workspace.color || "");
  const [tags, setTags] = useState<string[]>(workspace.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [isInviting, setIsInviting] = useState(false);

  const isOwner = workspace.role === 'owner';
  const isAdmin = workspace.role === 'admin' || isOwner;

  React.useEffect(() => {
    setName(workspace.name);
    setDescription(workspace.description || "");
    setColor(workspace.color || "");
    setTags(workspace.tags || []);
  }, [workspace]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateWorkspace(workspace.id, { 
        name, 
        description: description || undefined,
        color: color || null,
        tags
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkspace(workspace.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole, workspace.name);
      setInviteEmail("");
      setInviteRole("member");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>
            Manage your workspace settings and team members.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ws-description">Description</Label>
              <Textarea
                id="ws-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isAdmin}
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {WORKSPACE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => isAdmin && setColor(c.value)}
                    disabled={!isAdmin}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      c.value ? COLOR_CLASSES[c.value] : "bg-muted",
                      color === c.value ? "border-foreground ring-2 ring-offset-2 ring-primary" : "border-transparent",
                      !isAdmin && "opacity-50 cursor-not-allowed"
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {isAdmin && (
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleSaveSettings} 
                  disabled={isSaving || !name.trim()}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            )}

            {isOwner && (
              <div className="border-t pt-4 mt-6">
                <h4 className="text-sm font-medium text-destructive mb-2">Danger Zone</h4>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Workspace
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        workspace "{workspace.name}" and all diagrams within it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete Workspace"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4 mt-4">
            {isAdmin && (
              <form onSubmit={handleInvite} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Invite by email..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={!inviteEmail.trim() || isInviting}>
                  {isInviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </form>
            )}

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Pending Invitations</h4>
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{invitation.email}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {invitation.role}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => cancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Current Members */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Members</h4>
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {roleIcons[member.role]}
                    <span className="text-sm font-mono text-xs">
                      {member.user_id.slice(0, 8)}...
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {member.role}
                    </Badge>
                  </div>
                  {isAdmin && member.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      <Select 
                        value={member.role} 
                        onValueChange={(v) => updateMemberRole(member.id, v as WorkspaceRole)}
                      >
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

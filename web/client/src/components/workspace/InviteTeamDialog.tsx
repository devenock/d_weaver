import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import type { WorkspaceWithRole } from "@/hooks/useWorkspaces";
import { Loader2 } from "lucide-react";

interface InviteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWorkspace: WorkspaceWithRole | null;
}

export function InviteTeamDialog({
  open,
  onOpenChange,
  currentWorkspace,
}: InviteTeamDialogProps) {
  const { inviteMember, loading: membersLoading } = useWorkspaceMembers(
    currentWorkspace?.id ?? null,
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer" | "admin">("member");
  const [isInviting, setIsInviting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentWorkspace) return;
    setIsInviting(true);
    try {
      await inviteMember(email.trim(), role, currentWorkspace.name);
      setEmail("");
      setRole("member");
      onOpenChange(false);
    } catch {
      // Error shown by hook
    } finally {
      setIsInviting(false);
    }
  };

  const noWorkspace = !currentWorkspace;
  const canInvite = currentWorkspace && (currentWorkspace.role === "owner" || currentWorkspace.role === "admin");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite to workspace</DialogTitle>
            <DialogDescription>
              {noWorkspace
                ? "Select a workspace first to invite members."
                : !canInvite
                  ? "Only owners and admins can invite new members."
                  : `Send an invitation email with a join link. They'll sign up or log in, then join "${currentWorkspace.name}".`}
            </DialogDescription>
          </DialogHeader>
          {!noWorkspace && canInvite && (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="teammate@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as "member" | "viewer" | "admin")}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!email.trim() || isInviting || membersLoading}>
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send invitation"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
          {(!canInvite || noWorkspace) && (
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

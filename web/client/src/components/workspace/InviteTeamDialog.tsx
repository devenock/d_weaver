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
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

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
  const [joinLink, setJoinLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = (open: boolean) => {
    if (!open) {
      setJoinLink(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentWorkspace) return;
    setIsInviting(true);
    setJoinLink(null);
    try {
      const invitation = await inviteMember(email.trim(), role, currentWorkspace.name);
      if (invitation?.token) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setJoinLink(`${origin}/join?token=${encodeURIComponent(invitation.token)}`);
      } else {
        setEmail("");
        setRole("member");
        handleClose(false);
      }
    } catch {
      // Error shown by hook
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!joinLink) return;
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleDone = () => {
    setEmail("");
    setRole("member");
    setJoinLink(null);
    handleClose(false);
  };

  const noWorkspace = !currentWorkspace;
  const canInvite = currentWorkspace && (currentWorkspace.role === "owner" || currentWorkspace.role === "admin");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {joinLink ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation created</DialogTitle>
              <DialogDescription>
                If email is not set up, share this link with the invitee. They open it, sign up or log in with the same email, then they join the workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 py-2">
              <Input readOnly value={joinLink} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopyLink} title="Copy link">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleDone}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Invite to workspace</DialogTitle>
              <DialogDescription>
                {noWorkspace
                  ? "Select a workspace first to invite members."
                  : !canInvite
                    ? "Only owners and admins can invite new members."
                    : "An invitation email will be sent with a join link (if email is configured). Otherwise you can copy the link after sending."}
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
                  <Button type="button" variant="outline" onClick={() => handleClose(false)}>
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
                <Button type="button" onClick={() => handleClose(false)}>
                  Close
                </Button>
              </DialogFooter>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

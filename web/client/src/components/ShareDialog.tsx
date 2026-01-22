import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Link, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagramId: string | null;
  diagramTitle: string;
  isPublic: boolean;
  onVisibilityChange: (isPublic: boolean) => void;
}

export const ShareDialog = ({
  open,
  onOpenChange,
  diagramId,
  diagramTitle,
  isPublic,
  onVisibilityChange,
}: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);

  const shareUrl = diagramId 
    ? `${window.location.origin}/editor?diagramId=${diagramId}`
    : null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = async (checked: boolean) => {
    if (!diagramId) {
      toast.error("Please save the diagram first");
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("diagrams")
        .update({ is_public: checked })
        .eq("id", diagramId);

      if (error) throw error;

      onVisibilityChange(checked);
      toast.success(checked ? "Diagram is now public" : "Diagram is now private");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Share "{diagramTitle}"
          </DialogTitle>
          <DialogDescription>
            {isPublic 
              ? "Anyone with the link can view this diagram" 
              : "Only you and workspace members can access this diagram"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-primary" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label className="font-medium">Public access</Label>
                <p className="text-sm text-muted-foreground">
                  {isPublic ? "Anyone can view" : "Private to you"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={updating || !diagramId}
            />
          </div>

          {/* Share Link */}
          {diagramId ? (
            <div className="space-y-2">
              <Label>Share link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed text-center text-muted-foreground">
              <p className="text-sm">Save your diagram first to get a shareable link</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

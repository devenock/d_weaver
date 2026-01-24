import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

interface DiagramCommentsProps {
  diagramId: string | null;
  user: User | null;
}

export const DiagramComments = ({ diagramId, user }: DiagramCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (diagramId) {
      fetchComments();
    }
  }, [diagramId]);

  const fetchComments = async () => {
    if (!diagramId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("diagram_id", diagramId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast.error("Failed to load comments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("Please sign in to leave a comment");
      return;
    }

    if (!diagramId) {
      toast.error("Save the diagram first before commenting");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          diagram_id: diagramId,
          user_id: user.id,
          comment_text: newComment.trim(),
        });

      if (error) throw error;

      toast.success("Comment added successfully");
      setNewComment("");
      fetchComments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast.success("Comment deleted");
      fetchComments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getUserInitials = (userId: string) => {
    return userId.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!diagramId) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Save your diagram to enable comments</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Comments & Feedback</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {user && (
        <div className="mb-6 space-y-2">
          <Textarea
            placeholder="Share your feedback or leave a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px]"
          />
          <Button 
            onClick={handleSubmitComment} 
            disabled={submitting || !newComment.trim()}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No comments yet. Be the first to leave feedback!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-4 bg-muted/50 rounded-lg">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getUserInitials(comment.user_id)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">User</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </span>
                  {user?.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 px-2"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {comment.comment_text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

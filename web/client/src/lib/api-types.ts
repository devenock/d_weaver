/**
 * Shared types matching the Go API response shapes for workspaces, diagrams, and comments.
 */

export interface WorkspaceResponse {
  id: string;
  name: string;
  description: string;
  color: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWithRoleResponse extends WorkspaceResponse {
  role: string;
}

export interface MemberResponse {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  invited_by?: string | null;
  joined_at: string;
}

export interface InvitationResponse {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  token?: string;
  invited_by?: string | null;
  expires_at: string;
  created_at: string;
}

export interface DiagramResponse {
  id: string;
  title: string;
  content: string;
  diagram_type: string;
  image_url: string | null;
  is_public: boolean;
  user_id: string | null;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentResponse {
  id: string;
  diagram_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

import { apiRequestWithAuth } from "./api";
import type { DiagramResponse, CommentResponse } from "./api-types";

const BASE = "/api/v1";

export async function listDiagrams(
  accessToken: string,
): Promise<DiagramResponse[]> {
  return apiRequestWithAuth<DiagramResponse[]>(accessToken, `${BASE}/diagrams`, {
    method: "GET",
  });
}

export async function listPublicDiagrams(
  accessToken: string,
): Promise<DiagramResponse[]> {
  return apiRequestWithAuth<DiagramResponse[]>(
    accessToken,
    `${BASE}/diagrams/public`,
    { method: "GET" },
  );
}

export async function getDiagram(
  accessToken: string,
  diagramId: string,
): Promise<DiagramResponse> {
  return apiRequestWithAuth<DiagramResponse>(
    accessToken,
    `${BASE}/diagrams/${diagramId}`,
    { method: "GET" },
  );
}

export async function createDiagram(
  accessToken: string,
  body: {
    title: string;
    content: string;
    diagram_type: string;
    is_public?: boolean;
    workspace_id?: string | null;
  },
): Promise<DiagramResponse> {
  return apiRequestWithAuth<DiagramResponse>(accessToken, `${BASE}/diagrams`, {
    method: "POST",
    body: JSON.stringify({
      title: body.title,
      content: body.content,
      diagram_type: body.diagram_type,
      is_public: body.is_public ?? false,
      workspace_id: body.workspace_id ?? null,
    }),
  });
}

export async function updateDiagram(
  accessToken: string,
  diagramId: string,
  body: {
    title?: string;
    content?: string;
    diagram_type?: string;
    is_public?: boolean;
  },
): Promise<DiagramResponse> {
  return apiRequestWithAuth<DiagramResponse>(
    accessToken,
    `${BASE}/diagrams/${diagramId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        title: body.title ?? "",
        content: body.content ?? "",
        diagram_type: body.diagram_type ?? "",
        is_public: body.is_public,
      }),
    },
  );
}

export async function deleteDiagram(
  accessToken: string,
  diagramId: string,
): Promise<void> {
  await apiRequestWithAuth<void>(
    accessToken,
    `${BASE}/diagrams/${diagramId}`,
    { method: "DELETE" },
  );
}

export async function uploadDiagramImage(
  accessToken: string,
  diagramId: string,
  file: File,
): Promise<DiagramResponse> {
  const form = new FormData();
  form.append("file", file);
  return apiRequestWithAuth<DiagramResponse>(
    accessToken,
    `${BASE}/diagrams/${diagramId}/image`,
    {
      method: "POST",
      body: form,
    },
  );
}

export async function listComments(
  accessToken: string,
  diagramId: string,
): Promise<CommentResponse[]> {
  return apiRequestWithAuth<CommentResponse[]>(
    accessToken,
    `${BASE}/diagrams/${diagramId}/comments`,
    { method: "GET" },
  );
}

export async function addComment(
  accessToken: string,
  diagramId: string,
  commentText: string,
): Promise<CommentResponse> {
  return apiRequestWithAuth<CommentResponse>(
    accessToken,
    `${BASE}/diagrams/${diagramId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ comment_text: commentText }),
    },
  );
}

export async function updateComment(
  accessToken: string,
  diagramId: string,
  commentId: string,
  commentText: string,
): Promise<CommentResponse> {
  return apiRequestWithAuth<CommentResponse>(
    accessToken,
    `${BASE}/diagrams/${diagramId}/comments/${commentId}`,
    {
      method: "PUT",
      body: JSON.stringify({ comment_text: commentText }),
    },
  );
}

export async function deleteComment(
  accessToken: string,
  diagramId: string,
  commentId: string,
): Promise<void> {
  await apiRequestWithAuth<void>(
    accessToken,
    `${BASE}/diagrams/${diagramId}/comments/${commentId}`,
    { method: "DELETE" },
  );
}

import { apiRequestWithAuth } from "./api";
import type {
  WorkspaceWithRoleResponse,
  WorkspaceResponse,
  MemberResponse,
  InvitationResponse,
} from "./api-types";

const BASE = "/api/v1";

export async function listWorkspaces(
  accessToken: string,
): Promise<WorkspaceWithRoleResponse[]> {
  return apiRequestWithAuth<WorkspaceWithRoleResponse[]>(
    accessToken,
    `${BASE}/workspaces`,
    { method: "GET" },
  );
}

export async function createWorkspace(
  accessToken: string,
  body: { name: string; description?: string; color?: string; tags?: string[] },
): Promise<WorkspaceResponse> {
  return apiRequestWithAuth<WorkspaceResponse>(accessToken, `${BASE}/workspaces`, {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      description: body.description ?? "",
      color: body.color ?? "",
      tags: body.tags ?? [],
    }),
  });
}

export async function getWorkspace(
  accessToken: string,
  workspaceId: string,
): Promise<WorkspaceResponse> {
  return apiRequestWithAuth<WorkspaceResponse>(
    accessToken,
    `${BASE}/workspaces/${workspaceId}`,
    { method: "GET" },
  );
}

export async function updateWorkspace(
  accessToken: string,
  workspaceId: string,
  body: {
    name?: string;
    description?: string;
    color?: string;
    tags?: string[];
  },
): Promise<WorkspaceResponse> {
  return apiRequestWithAuth<WorkspaceResponse>(
    accessToken,
    `${BASE}/workspaces/${workspaceId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: body.name ?? "",
        description: body.description ?? "",
        color: body.color ?? "",
        tags: body.tags ?? [],
      }),
    },
  );
}

export async function deleteWorkspace(
  accessToken: string,
  workspaceId: string,
): Promise<void> {
  await apiRequestWithAuth<void>(
    accessToken,
    `${BASE}/workspaces/${workspaceId}`,
    { method: "DELETE" },
  );
}

export async function listMembers(
  accessToken: string,
  workspaceId: string,
): Promise<MemberResponse[]> {
  return apiRequestWithAuth<MemberResponse[]>(
    accessToken,
    `${BASE}/workspaces/${workspaceId}/members`,
    { method: "GET" },
  );
}

export async function inviteMember(
  accessToken: string,
  workspaceId: string,
  body: { email: string; role?: string },
): Promise<InvitationResponse> {
  return apiRequestWithAuth<InvitationResponse>(
    accessToken,
    `${BASE}/workspaces/${workspaceId}/invitations`,
    {
      method: "POST",
      body: JSON.stringify({ email: body.email, role: body.role ?? "member" }),
    },
  );
}

export async function updateMemberRole(
  accessToken: string,
  workspaceId: string,
  userId: string,
  role: string,
): Promise<MemberResponse> {
  return apiRequestWithAuth<MemberResponse>(
    accessToken,
    `${BASE}/workspaces/${workspaceId}/members/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify({ role }),
    },
  );
}

export async function removeMember(
  accessToken: string,
  workspaceId: string,
  userId: string,
): Promise<void> {
  await apiRequestWithAuth<void>(
    accessToken,
    `${BASE}/workspaces/${workspaceId}/members/${userId}`,
    { method: "DELETE" },
  );
}

export async function acceptInvitation(
  accessToken: string,
  token: string,
): Promise<WorkspaceResponse> {
  return apiRequestWithAuth<WorkspaceResponse>(
    accessToken,
    `${BASE}/invitations/accept`,
    {
      method: "POST",
      body: JSON.stringify({ token }),
    },
  );
}

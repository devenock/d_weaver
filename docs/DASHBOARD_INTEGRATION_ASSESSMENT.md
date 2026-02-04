# Dashboard Integration Assessment

This document assesses **frontend readiness** and **backend API readiness** for integrating the dashboard with the Go API (replacing Supabase for data and auth).

---

## 1. Backend API Readiness

### 1.1 Workspaces (`/api/v1/workspaces/*`)

| Capability | Backend | Notes |
|------------|---------|--------|
| List workspaces | ✅ `GET /workspaces` | Returns `[]WorkspaceResponse`. **Gap:** Response does not include the current user's **role** per workspace. Frontend expects `WorkspaceWithRole` (workspace + role). |
| Create workspace | ✅ `POST /workspaces` | Body: `name`, `description?`, `color?`, `tags?`. Creates workspace and adds caller as owner. |
| Get one | ✅ `GET /workspaces/:id` | |
| Update | ✅ `PUT /workspaces/:id` | |
| Delete | ✅ `DELETE /workspaces/:id` | |
| List members | ✅ `GET /workspaces/:id/members` | |
| Invite | ✅ `POST /workspaces/:id/invitations` | Body: `email`, `role?` |
| Update member role | ✅ `PUT /workspaces/:id/members/:userId` | |
| Remove member | ✅ `DELETE /workspaces/:id/members/:userId` | |
| Accept invitation | ✅ `POST /invitations/accept` | Body: `token` (UUID) |

**Backend response shape (workspace):** `id`, `name`, `description`, `color`, `tags`, `created_by`, `created_at`, `updated_at`. No `role` in list.

---

### 1.2 Diagrams (`/api/v1/diagrams/*`)

| Capability | Backend | Notes |
|------------|---------|--------|
| List diagrams | ✅ `GET /diagrams` | Returns all diagrams visible to the user (personal + workspace). **No query param for workspace_id** – filtering by workspace is done client-side from the full list. |
| List public | ✅ `GET /diagrams/public` | |
| Create | ✅ `POST /diagrams` | Body: `title`, `content`, `diagram_type`, `is_public?`, `workspace_id?` |
| Get one | ✅ `GET /diagrams/:id` | |
| Update | ✅ `PUT /diagrams/:id` | Body: `title`, `content`, `diagram_type`, `is_public?` |
| Delete | ✅ `DELETE /diagrams/:id` | |
| Upload image | ✅ `POST /diagrams/:id/image` | Multipart form `file`. Saves under server `UPLOAD_DIR`; returns diagram with `image_url` like `/uploads/diagrams/<id>/<filename>`. **No Supabase Storage** – URLs are same-origin (e.g. `https://api.example.com/uploads/...`). |
| List comments | ✅ `GET /diagrams/:id/comments` | |
| Add comment | ✅ `POST /diagrams/:id/comments` | Body: `comment_text` |
| Update comment | ✅ `PUT /diagrams/:id/comments/:commentId` | |
| Delete comment | ✅ `DELETE /diagrams/:id/comments/:commentId` | |

**Backend response shape (diagram):** `id`, `title`, `content`, `diagram_type`, `image_url`, `is_public`, `user_id`, `workspace_id`, `created_at`, `updated_at`. Aligns with Supabase `diagrams` row; field names match.

---

### 1.3 Auth

Already integrated: login, register, logout, refresh, forgot-password, reset-password. Dashboard uses `useAuth()` for user and logout. **All auth flows use the Go API.**

---

### 1.4 Real-time

- **Backend:** WebSocket at `/ws/collaboration/:diagramId` for collaboration (cursors, presence). No Supabase Realtime.
- **Frontend:** EmbeddedEditor uses Supabase Realtime **for comments** (postgres_changes on `comments`). Moving to Go API means comments are REST-only (poll after add or refetch on focus) unless we add a comment-specific realtime channel later.

---

## 2. Frontend Readiness (Dashboard)

### 2.1 What the dashboard uses today

| Area | Current implementation | Go API equivalent |
|------|------------------------|-------------------|
| **Auth** | `useAuth()` (already Go) | ✅ Done |
| **Workspaces** | `useWorkspaces()` – Supabase: `workspace_members` + `workspaces`, RPC `create_workspace`, postgres_changes | Need: REST list/create/update/delete + optional refetch or no live subscription |
| **Diagram list** | `Dashboard.tsx`: `supabase.from("diagrams").select("*")` filtered by `currentWorkspace?.id` or null | `GET /diagrams` then client-side filter by `workspace_id` |
| **DashboardContent** | Delete: `supabase.from("diagrams").delete()`. Share: `supabase.from("diagrams").update({ is_public: true })`. Download: `fetch(diagram.image_url)` | DELETE, PUT, and image_url must point to API origin for `/uploads/...` |
| **EmbeddedEditor** | Load: `supabase.from("diagrams").select("*").eq("id", diagramId).single()`. Save: insert or update; image: Supabase Storage upload then `getPublicUrl` + update diagram | GET/POST/PUT diagrams; image: `POST /diagrams/:id/image` (multipart), then `image_url` is relative to API (e.g. prepend `VITE_API_URL` origin for display) |
| **EmbeddedWhiteboard** | Same as editor (load/save diagram, image to Supabase Storage) | Same as editor |
| **Comments (editor)** | Supabase `comments` table + Realtime channel | GET/POST (and optionally PUT/DELETE) comments via REST; no realtime unless we add it later |

### 2.2 Gaps and required work

1. **Authenticated API client**  
   All workspace and diagram endpoints require `Authorization: Bearer <access_token>`. The app has `apiRequest()` and `auth-api` but no helper that attaches the access token. Need either:
   - `apiRequestWithAuth(path, options)` that reads `accessToken` from AuthContext and sets the header, or
   - A shared client/hook that provides an authenticated fetch.

2. **Workspace list and role**  
   Frontend expects `WorkspaceWithRole` (workspace + `role`). Backend list returns `WorkspaceResponse` only. Options:
   - **Backend:** Extend list response to include `role` per workspace (e.g. join with `workspace_members` and return `role`). Recommended.
   - **Frontend:** Call `GET /workspaces/:id/members` for each workspace and find self (N+1, not ideal).

3. **Workspace create**  
   Frontend currently uses Supabase RPC `create_workspace(_name, _description)`. Replace with `POST /workspaces` with body `{ name, description? }`. Backend already supports this.

4. **Diagram list**  
   Replace Supabase query with `GET /diagrams` (with auth), then filter in the client by `workspace_id` (match `currentWorkspace?.id` or `null` for personal). Backend returns all visible diagrams; client already has “personal vs workspace” filtering logic.

5. **Diagram CRUD in Dashboard and Editor/Whiteboard**  
   - **Load:** Replace `supabase.from("diagrams").select(...).single()` with `GET /diagrams/:id` (auth).
   - **Create:** `POST /diagrams` with `title`, `content`, `diagram_type`, `workspace_id?`.
   - **Update:** `PUT /diagrams/:id` with `title`, `content`, `diagram_type`, `is_public`.
   - **Delete:** `DELETE /diagrams/:id`.
   - **Image upload:** Replace Supabase Storage with `POST /diagrams/:id/image` (multipart). Use returned `image_url`; when displaying, if it’s a path like `/uploads/...`, prepend API base URL (e.g. from `getApiBaseUrl()` or `VITE_API_URL`).

6. **Image URL base**  
   Backend serves uploads at `/uploads/...`. From the browser, these must be requested from the API origin. Ensure `image_url` is either:
   - Full URL (if backend starts returning one), or
   - Prefixed in the frontend: `const imageBase = getApiBaseUrl(); const fullUrl = image_url.startsWith('/') ? imageBase + image_url : image_url`.

7. **Comments**  
   Replace Supabase comments with:
   - Load: `GET /diagrams/:id/comments`.
   - Add: `POST /diagrams/:id/comments` with `{ comment_text }`.
   - Optionally update/delete via PUT/DELETE.  
   Remove Supabase Realtime for comments; refetch after add (or on interval/focus) unless you add a dedicated realtime channel later.

8. **Types**  
   Replace Supabase `Tables<"diagrams">` / `Tables<"workspaces">` with shared TypeScript types that match the Go API response shapes (`DiagramResponse`, `WorkspaceResponse`, etc.). Optional: keep a single source of truth (e.g. `lib/api-types.ts`) for diagram and workspace.

9. **useWorkspaces**  
   Rewrite to use REST:
   - List: `GET /workspaces` (and optionally extend backend to return role).
   - Create: `POST /workspaces`.
   - Update/delete: `PUT /workspaces/:id`, `DELETE /workspaces/:id`.
   - Remove Supabase and postgres_changes; call list again after mutations or expose a `refreshWorkspaces()` that the UI already uses.

10. **Real-time (optional)**  
    Collaboration (cursors/presence) is already planned on the Go WebSocket. Comments realtime can be deferred: start with REST-only comments and add a comment channel later if needed.

---

## 3. Suggested Approach

### Phase 1 – Foundation (do first)

1. **Authenticated API helper**  
   Add a way to call the API with the current access token (e.g. `apiRequestWithAuth` or a hook that returns an authenticated fetch). Use the same `apiRequest` envelope and error handling.

2. **Shared types**  
   Add `lib/diagram-api.ts` and `lib/workspace-api.ts` (or a single `lib/api-types.ts` + functions) defining:
   - Types that match backend (e.g. `DiagramResponse`, `WorkspaceResponse`, and if backend is extended, `WorkspaceWithRoleResponse`).
   - Functions: list diagrams, get diagram, create, update, delete, upload image; list workspaces, create workspace, get, update, delete, members, invite, accept invitation. All use the authenticated helper.

3. **Backend: workspace list with role (recommended)**  
   Extend `GET /workspaces` response to include the current user’s `role` for each workspace (e.g. join with `workspace_members` and add `role` to each item). This keeps the frontend simple and avoids N+1.

### Phase 2 – Dashboard and workspaces

4. **Replace useWorkspaces**  
   Implement `useWorkspaces` using the new workspace API (list, create, update, delete). Remove Supabase and Realtime; use refresh after mutations.

5. **Dashboard diagram list**  
   In `Dashboard.tsx`, replace `loadDiagrams()` Supabase call with `GET /diagrams` via the new diagram API, then keep the same client-side filtering by `currentWorkspace?.id` / null.

6. **DashboardContent**  
   Wire delete and “share” (set public) to `DELETE /diagrams/:id` and `PUT /diagrams/:id` with `is_public: true`. For download, resolve `image_url` with API base URL when it’s a path.

### Phase 3 – Editor and whiteboard

7. **EmbeddedEditor and EmbeddedWhiteboard**  
   - Load diagram: `GET /diagrams/:id`.
   - Save (create): `POST /diagrams` with `workspace_id` when in a workspace.
   - Save (update): `PUT /diagrams/:id`.
   - Image: `POST /diagrams/:id/image` with multipart file; use returned `image_url` and prepend API base when needed for `<img>` or download.

8. **Comments in EmbeddedEditor**  
   Replace Supabase comments with `GET /diagrams/:id/comments` and `POST /diagrams/:id/comments`; refetch after adding. Remove Realtime subscription for comments.

### Phase 4 – Polish

9. **Image URL handling**  
   Centralize logic: if `image_url` is relative (e.g. starts with `/uploads/`), prepend `getApiBaseUrl()` (or equivalent) so thumbnails and download work from the browser.

10. **Error handling and toasts**  
    Use the same error shape as auth (e.g. `ApiError` and `body.message`); show toasts on failure so the user sees clear feedback.

---

## 4. Summary Table

| Layer | Backend | Frontend | Action |
|-------|---------|----------|--------|
| Auth | ✅ | ✅ | Done |
| Workspaces list | ✅ (no role) | Supabase | Add role to list; add workspace API + useWorkspaces over REST |
| Workspaces create/update/delete | ✅ | Supabase | Switch to REST |
| Diagram list | ✅ | Supabase | Add diagram API; call from Dashboard |
| Diagram get/create/update/delete | ✅ | Supabase | Use REST in Dashboard, Editor, Whiteboard |
| Diagram image | ✅ (multipart, /uploads) | Supabase Storage | Use POST /diagrams/:id/image; resolve image_url with API base |
| Comments | ✅ | Supabase + Realtime | Use REST; refetch after add; drop Realtime for now |
| Realtime (collab) | ✅ WebSocket | — | Wire when you add collaboration UI |

Starting with **Phase 1** (auth API helper + types + workspace list with role) gives a clear base to then swap the dashboard and editor/whiteboard to the Go API step by step.

# Dashboard UX Analysis: Creately vs DWeaver

This document compares **Creately’s post-login dashboard** with **DWeaver’s current dashboard** to identify domain patterns, reasoning behind common choices, and concrete improvements that support a robust, engineer-focused platform for visual thinking—without copying UI or features 1:1.

---

## 1. Creately dashboard – what they do and why it matters

### 1.1 Two clear entry points

- **Create New** (top of main area): One section dedicated to starting something new.
  - **Blank** canvas is the primary option (large “+” card).
  - **Templates** are visible as thumbnails (Genogram, Kanban, Flowchart, Mind Map, Org Chart, UML Class, Concept Map) plus “More Templates.”
- **Workspaces** (below): Existing work, with filter (e.g. by role) and sort (e.g. last updated), shown as cards with thumbnails.

**Why it matters:** Users have two distinct mental modes: “I want to start something” vs “I want to open something I have.” Putting both on the same screen reduces friction and makes the product feel capable without clutter.

### 1.2 Sidebar structure

- **Search** at top: “Search by folder or diagram” — global discoverability.
- **Primary nav:** Recent (current view), Home — “Recent” is a first-class destination, not buried.
- **Organization buckets:** Personal → My Organization → Archived. Clear separation of “mine,” “team,” and “put away.”
- **User context** at bottom: Avatar, name, email, settings. Always visible; no need to open the main area to see who’s logged in.

**Why it matters:** Personal vs organization supports collaboration and permissions. Archived keeps the main list manageable. Recent as a top-level view speeds up “continue where I left off.”

### 1.3 Main content behavior

- **Breadcrumbs:** “Dashboard > Recent” — orientation and wayfinding.
- **View toggles:** Grid vs list for workspaces — different density preferences.
- **New folder** in header — organization at scale.
- **Workspace cards:** Thumbnails, title, last-updated time, context menu (⋯). Filter by role; sort by last updated.

**Why it matters:** Thumbnails aid recognition. Filter/sort and view toggle are standard in content-heavy tools. Folders scale when users have many items.

---

## 2. DWeaver dashboard – what you have today

### 2.1 Strengths

- **Workspace-centric sidebar:** Workspaces → Diagrams → Whiteboards → Recent. Clear hierarchy and collapsible sections; “New Workspace” and + on each section.
- **Unified search** in header; **Invite Team** prominent (collaboration-first).
- **Empty state:** “No diagrams yet. Create your first one!” with a clear CTA — good onboarding.
- **Diagram cards:** Thumbnails (when `image_url` exists), type, date, actions (View/Edit, Download, Share, Delete).
- **Recent** in sidebar (top 5) and **separate Diagrams vs Whiteboards** — matches your product model.
- **Theme toggle, notifications, profile** in header — modern app bar.

### 2.2 Gaps vs domain norms

| Area | Creately (reference) | DWeaver today | Impact |
|------|----------------------|---------------|--------|
| **Create entry point** | Dedicated “Create New” with Blank + template row | Single “New Diagram” / “Create a Diagram”; no templates on dashboard | Users who want a template or a whiteboard don’t see options upfront; templates live in Gallery/editor, not in dashboard. |
| **Default view** | “Recent” as a named view (Dashboard > Recent) | Main content is “Your Diagrams” (list for current workspace) | “Recent” is sidebar-only; no dedicated “home” that mixes recent + create. |
| **Filter / sort** | Filter by role, sort by last updated (newest) | No filter or sort on diagram list | Harder to manage many diagrams; no “my role” or “newest first” without scrolling. |
| **Personal vs shared** | Sidebar: Personal / My Organization / Archived | Workspaces list only; “Personal” implied when no workspace selected | No explicit “personal” vs “team” bucket in nav; archived not present. |
| **Templates on dashboard** | Template thumbnails in main “Create New” section | Templates in `TemplatesGallery`; not wired from dashboard | Extra step to start from a template; engineers expect quick starts (e.g. UML, flowchart). |
| **AI as create path** | N/A (reference) | `AIGenerateDialog` exists but not surfaced on dashboard | AI could be a first-class “create” option and differentiator. |
| **Breadcrumbs** | Dashboard > Recent | None | No explicit context when in dashboard or after opening a diagram. |
| **View density** | Grid / list toggle | Grid only | Some users prefer list view for many items. |
| **Folders** | “New folder” in header | No folders | Less critical early; matters when users have dozens of diagrams. |

---

## 3. Domain patterns (what’s common and why)

These show up across diagramming and collaborative tools; adopting them in your own way will make DWeaver feel familiar and robust.

1. **Split “create” vs “open”**
   - One area for “start new” (blank + templates +, for you, AI).
   - One area for “my/our stuff” (list/grid with filter/sort).

2. **Templates visible at point of creation**
   - Reduces “blank page” anxiety and speeds up starts (flowchart, UML, mind map, etc.).

3. **Search over “my content”**
   - By diagram name, type, or (if you add it) folder/workspace. You have search; consider scoping (e.g. “in this workspace” vs “everywhere”).

4. **Personal vs shared structure**
   - Some notion of “mine” vs “team/org” in nav or filters. You have workspaces; surfacing “Personal” (e.g. `workspace_id == null`) as its own bucket could help.

5. **Recent as a first-class view**
   - A “Recent” or “Home” that shows last-opened items + quick create is a common default landing.

6. **Thumbnails for recognition**
   - You already use `image_url` on cards; keeping thumbnails prominent and consistent is important.

7. **Filter and sort on lists**
   - By type, date, name; optionally by role when in a workspace. Expected in professional tools.

8. **Breadcrumbs or clear context**
   - So users always know where they are (e.g. Dashboard > [Workspace] > Diagrams).

---

## 4. Recommendations for DWeaver

### 4.1 High impact, align with domain

- **“Create New” section on dashboard**
  - In the main content (above or beside the diagram list), add a small “Create New” block:
    - **Blank diagram** (primary).
    - **Blank whiteboard**.
    - **From template** (reuse or adapt `TemplatesGallery` — e.g. 4–6 template cards + “More”).
    - **Generate with AI** (surface `AIGenerateDialog` or equivalent via Go API) as a first-class option.
  - Keeps your own layout and components; no need to copy Creately’s exact layout.

- **Recent as a default or alternate view**
  - Either make “Recent” a tab/section (e.g. “Recent” vs “Diagrams” vs “Whiteboards”) or add a “Home” that shows recent items + Create New. Ensures “continue where I left off” is one click.

- **Filter and sort on “Your Diagrams”**
  - **Filter:** e.g. by type (diagram / whiteboard), or by role when viewing a workspace.
  - **Sort:** e.g. Last updated (newest/oldest), Name A–Z. Dropdown or toggle in the list header.

- **Templates from dashboard**
  - From “Create New” or “New Diagram,” open template picker (dialog or inline) so users can start from Microservices, CI/CD, User Auth, etc. without opening the editor first.

### 4.2 Medium impact (structure and clarity)

- **Personal vs Team in sidebar**
  - Keep workspaces as the main list; optionally group or label “Personal” (e.g. diagrams with no workspace) and “Team workspaces” so the mental model matches Creately’s “Personal / My Organization” without copying their UI.

- **Breadcrumbs**
  - When you have multiple levels (Dashboard > Workspace X > Diagrams, or Dashboard > Recent), add a small breadcrumb row so context is always clear.

- **Search scope**
  - Consider “Search in this workspace” vs “Search all” (or a scope selector) so power users can narrow results.

### 4.3 Later / optional

- **View toggle (grid / list)** for diagram list when you have many items.
- **Folders** (or “projects” inside a workspace) when users need deeper hierarchy.
- **Archived** section or filter (“hide archived”) to keep the main list focused.

### 4.4 Differentiators (AI era)

- **AI generate as a create path:** Prominent “Generate with AI” in the Create New section, wired to your Go AI API. Descriptions like “CI/CD pipeline” or “auth flow” → diagram in one step.
- **Engineer-focused templates:** Emphasize system design, sequence, class, ER, deployment (you already have some in `TemplatesGallery`). Name and group them for “architecture” and “flows.”
- **Collaboration:** You already have Invite Team and workspaces; real-time collaboration (e.g. cursors, presence via WebSocket) will matter more than duplicating every Creately feature.

---

## 5. Summary

- **Creately** separates “Create New” (blank + templates) from “Workspaces” (filter, sort, thumbnails), uses Personal/Organization/Archived and Recent as first-class, and keeps search and view toggles visible. Those choices support both “start something” and “find something” without clutter.
- **DWeaver** already has a strong base: workspace-centric sidebar, diagrams vs whiteboards, good empty state, and diagram cards with actions. The main improvements are: **(1)** a clear “Create New” area with blank + templates + AI, **(2)** Recent (or Home) as a first-class view, **(3)** filter and sort on the diagram list, and **(4)** surfacing templates and AI from the dashboard. Personal/Team labeling, breadcrumbs, and search scope will further align you with domain norms. Folders and archived can follow as the product scales.

Using this as a product/UX guide (rather than a pixel-level spec) will help you build a robust, familiar, but distinct experience for engineers and anyone who wants to brainstorm and think visually.

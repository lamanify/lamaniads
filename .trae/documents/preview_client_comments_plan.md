# Client Comments on Preview — Plan

## Problem
Agency creates Google Ads draft → shares preview URL with client → client needs to give feedback on specific headlines/descriptions. Currently no way for client to leave comments; feedback goes through WhatsApp/email, making it hard to map to specific copy lines.

---

## Design Philosophy
- **Inline contextual feedback**: Comment on the exact headline or description, not a generic text box
- **Zero auth friction**: Client opens link, types name once, starts commenting
- **Non-destructive**: Comments are additive; agency sees them, decides what to act on
- **Sleek & minimal**: Follows LamaniAds brand — zinc monochrome, hairline borders, no clutter

---

## UX Flow

### 1. Client Identity (Lightweight)
- On first visit, a subtle bottom bar or inline prompt asks: **"Your name"** (single text input + "Continue" button)
- Name stored in `localStorage` — no signup, no email, no password
- Shown as a small pill in header: `Reviewing as: John`
- Can change name by clicking the pill

### 2. Inline Comment Trigger
- Each headline/description row gets a **comment icon** (💬 `MessageSquare` from Lucide) on the right side, visible on hover (desktop) or always visible (mobile)
- Icon shows **comment count badge** if comments exist (e.g., small red dot or `(2)`)
- Clicking icon opens a **comment thread popover** anchored to that row — not a modal, not a sidebar. A small floating card below/beside the row.

### 3. Comment Thread Popover
```
┌─────────────────────────────────────┐
│ Headline 3: "Get Started Today"     │  ← context label
│─────────────────────────────────────│
│ 🟤 John  ·  2 min ago              │
│ "Can we change this to mention      │
│  the promo?"                        │
│─────────────────────────────────────│
│ 🟢 Agency  ·  just now             │
│ "Sure, will update."                │
│─────────────────────────────────────│
│ ┌─────────────────────────────┐     │
│ │ Write a comment...          │     │
│ └─────────────────────────────┘     │
│                         [Send ▸]    │
└─────────────────────────────────────┘
```

- Popover width: ~320px, max-height with scroll
- Each comment: author name, relative time, message text
- Input at bottom: single-line textarea that grows, send on Enter or button
- Close on click outside or ESC

### 4. Visual Indicators on Rows
- Rows with comments get a subtle left accent border (brand color `#e9204f`) 
- Comment count shown as small badge on the `MessageSquare` icon
- Rows without comments: icon is faded zinc-400, appears on hover only

### 5. Comment Summary in Sidebar
- New sidebar tab: **"Comments"** (with `MessageSquare` icon) added below "Campaign"
- Shows a flat list of all comments grouped by headline/description
- Each entry: "Headline 3 — 2 comments" → clickable, scrolls to that row and opens popover
- Shows total unresolved comment count as badge on the sidebar tab

---

## Data Model

### New Table: `campaign_draft_comments`
```sql
create table campaign_draft_comments (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references campaign_drafts(id) on delete cascade,
  field_type text not null,          -- 'headline' | 'description'
  field_index int not null,          -- 0-based index (which headline/description)
  author_name text not null,         -- client-provided name
  author_type text not null default 'client',  -- 'client' | 'agency'
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_comments_draft on campaign_draft_comments(draft_id);
create index idx_comments_field on campaign_draft_comments(draft_id, field_type, field_index);
```

- No auth model needed — `author_name` is free text from `localStorage`
- `author_type` distinguishes client vs agency (future: agency users auto-tag as 'agency')
- `resolved` allows agency to mark comments as addressed (future feature)
- RLS: allow anon insert/select on this table (public preview page has no auth)

### RLS Policies
```sql
alter table campaign_draft_comments enable row level security;

-- Anyone can read comments for a draft
create policy comments_select on campaign_draft_comments
  for select to anon using (true);

-- Anyone can insert comments
create policy comments_insert on campaign_draft_comments
  for insert to anon with check (true);
```

---

## API Endpoints

### `GET /campaigns/public/drafts/{draft_id}/comments`
- No auth required
- Returns all comments for draft, ordered by `created_at asc`
- Response: `Array<{ id, field_type, field_index, author_name, author_type, message, resolved, created_at }>`

### `POST /campaigns/public/drafts/{draft_id}/comments`
- No auth required
- Body: `{ field_type, field_index, author_name, message }`
- Auto-sets `author_type: 'client'`
- Returns created comment

---

## Frontend Implementation

### Files Modified

#### 1. `apps/web/app/preview/google-ad/page.tsx`
- Add state: `comments`, `reviewerName`, `showNamePrompt`
- Fetch comments on mount alongside draft data
- Add "Comments" tab to left sidebar with badge count
- Each headline/description row → wrap with comment trigger
- Name prompt: inline card at page top if no name in localStorage

#### 2. New Component: `apps/web/app/preview/google-ad/CommentThread.tsx`
- Receives: `draftId`, `fieldType`, `fieldIndex`, `authorName`, `comments[]`, `onSubmit`
- Renders popover with comment list + input
- Uses Lucide `MessageSquare`, `Send` icons
- Brand styling: zinc bg, hairline border, rounded-lg

#### 3. `apps/web/lib/campaignsApi.ts`
- Add `getPublicComments(draftId)` 
- Add `addPublicComment(draftId, body)`

#### 4. `apps/api/src/api/campaigns.py`
- Add two new public endpoints (GET + POST comments)

#### 5. `supabase/migrations/campaign_draft_comments.sql`
- New table + indexes + RLS

---

## Implementation Steps

### Step 1: Database
- Create migration file `supabase/migrations/campaign_draft_comments.sql`
- Create table, indexes, RLS policies
- Apply migration

### Step 2: Backend API
- Add `GET /campaigns/public/drafts/{draft_id}/comments` endpoint
- Add `POST /campaigns/public/drafts/{draft_id}/comments` endpoint  
- Both public (no `Depends(get_current_org_id)`)

### Step 3: Frontend API Layer
- Add `getPublicComments` and `addPublicComment` methods to `campaignsApi.ts`

### Step 4: CommentThread Component
- Build standalone popover component
- Comment list with author, time, message
- Input with send button
- Animation: fade-in + scale-95 → scale-100 (150ms per brand guidelines)

### Step 5: Preview Page Integration
- Add reviewer name flow (localStorage + header pill)
- Wrap headline/description rows with comment triggers
- Add "Comments" sidebar tab
- Fetch and display comments
- Real-time optimistic updates on submit

### Step 6: Polish
- Comment count badges on rows and sidebar
- Left accent border on rows with comments
- Empty states for no comments
- Mobile responsive adjustments (popover becomes bottom sheet on small screens)

---

## Open Decisions
1. **Real-time sync**: Should comments update live via polling or just on page load? Recommendation: poll every 30s — simple, no WebSocket complexity.
2. **Resolve/unresolve**: Should agency be able to mark comments resolved from preview page or only from dashboard? Recommendation: defer to v2, keep v1 as simple comment-only.
3. **Comment editing/deletion**: Recommendation: defer to v2 — v1 is append-only.
4. **Notification**: Should agency get notified when client comments? Recommendation: defer to v2.

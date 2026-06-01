# Plan: Meta Ads Campaign Creation Wizard

Three-step creation flow inside Campaign Manager. Mirrors Meta hierarchy: Campaign → Ad Set → Ad. Built as full-page wizard route at `/campaigns/new`. Internal draft persisted in DB. Publish to Meta on final step (skip approval gate for now; reserve schema hooks).

---

## Architecture decisions

1. **Wizard surface**: full-page route `/campaigns/new` (not modal). Matches Meta Ads Manager UX, supports deep-link resume, plays well with file uploads. "New window" interpreted as new view, not browser popup.
2. **Draft persistence**: Supabase table `campaign_drafts` with JSONB payload per step. Auto-save on step transition. Resume from `/campaigns/new?draft=<id>`.
3. **Publish strategy**: single transactional publish on Step 3 finish. Calls Meta in order Campaign → AdSet → Ad. Roll-back via PAUSED status on partial failure (Meta has no atomic delete; best-effort cleanup logged).
4. **State management**: client-side React Context (`CampaignDraftContext`) holding `draft` + `setDraft` + `saveDraft`. No new dep (no zustand, no react-hook-form). Native `<form>` + `useState` per step.
5. **Validation**: extend `packages/schemas/src/entities.ts` with `CampaignDraftSchema`, `AdSetDraftSchema`, `AdDraftSchema` zod schemas. Validate per step before advancing.
6. **OAuth scopes**: extend Meta connect to include `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `pages_manage_metadata`, `business_management`, `ads_management`. Existing connections stay; new connects pick up new scopes. Document re-connect prompt for users missing scopes.
7. **Approval gate**: out of scope for v1 but DB schema reserves `status` enum and `client_review_token` column.

---

## Phase 1 — Database (Supabase migration)

File: `supabase/migrations/00X_campaign_drafts.sql` (new). Use Supabase MCP `apply_migration`.

Tables:

```sql
create type campaign_draft_status as enum (
  'draft',                  -- in progress, not yet finished
  'ready_for_review',       -- internal draft complete
  'awaiting_client',        -- shared via review link
  'approved',               -- client approved, ready to publish
  'publishing',             -- publish in progress
  'published',              -- live on Meta
  'failed'                  -- publish errored
);

create table campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references users(id),
  platform text not null default 'meta',
  platform_account_id text not null,            -- e.g. '123828087484282'
  name text not null,
  client_name text,
  internal_naming text,
  status campaign_draft_status not null default 'draft',
  step int not null default 1,                  -- 1=campaign,2=adset,3=ad,4=done
  campaign_payload jsonb not null default '{}', -- objective, buying_type, special_ad_categories, daily/lifetime budget if CBO
  client_review_token text unique,              -- nullable, generated when shared
  published_campaign_id text,                   -- platform id after publish
  publish_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_draft_adsets (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references campaign_drafts(id) on delete cascade,
  position int not null default 0,
  name text not null,
  payload jsonb not null default '{}',          -- conversion_location, optimization_goal, billing_event, targeting (geo,age,gender,interests,custom_audiences,placements), budget, schedule
  published_adset_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_draft_ads (
  id uuid primary key default gen_random_uuid(),
  adset_id uuid not null references campaign_draft_adsets(id) on delete cascade,
  position int not null default 0,
  name text not null,
  payload jsonb not null default '{}',          -- page_id, ig_id, format (single_image|video|carousel), media_ids, primary_text, headline, description, cta_type, destination_url, tracking
  published_ad_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on campaign_drafts(org_id, status);
create index on campaign_draft_adsets(draft_id);
create index on campaign_draft_ads(adset_id);
```

RLS policies: select/insert/update/delete only when `org_id` matches a row in `memberships` for `auth.uid()`. Mirror existing pattern from `campaigns` table.

SQLAlchemy mirror in `apps/api/src/db/base.py`: add `CampaignDraft`, `CampaignDraftAdSet`, `CampaignDraftAd` ORM classes.

---

## Phase 2 — Backend API extensions

### 2.1 Extend `MetaAdsAdapter` (apps/api/src/core/meta_adapter.py)

Add methods (all using existing `httpx.AsyncClient` pattern, Graph API v19.0):

```python
async def list_pages() -> List[{id, name, access_token, instagram_business_account_id?}]
async def list_instagram_accounts(page_id) -> List[{id, username}]
async def list_custom_audiences(account_id) -> List[{id, name, subtype, approximate_count}]
async def search_targeting_interests(query) -> List[{id, name, audience_size_lower_bound, audience_size_upper_bound}]
async def list_targeting_geo(query, type='country'|'region'|'city') -> List[{key, name, type, country_code}]

async def create_campaign(account_id, payload: dict) -> {id}
  # POST /act_{id}/campaigns
  # Required: name, objective (OUTCOME_TRAFFIC|OUTCOME_LEADS|OUTCOME_ENGAGEMENT|OUTCOME_SALES|...),
  # status (PAUSED on create), special_ad_categories (default [])
  # Optional: daily_budget|lifetime_budget (CBO), buying_type (AUCTION default)

async def create_adset(account_id, payload: dict) -> {id}
  # POST /act_{id}/adsets
  # Required: name, campaign_id, daily_budget|lifetime_budget (if not CBO),
  # billing_event, optimization_goal, bid_strategy, targeting (geo_locations, age_min/max, genders, interests, custom_audiences, publisher_platforms, facebook_positions, instagram_positions),
  # start_time, end_time?, status=PAUSED, destination_type (WEBSITE|ON_AD|MESSENGER|INSTANT_FORM)

async def upload_image(account_id, file_bytes) -> {hash}
  # POST /act_{id}/adimages multipart

async def upload_video(account_id, file_bytes) -> {video_id}
  # POST /act_{id}/advideos chunked

async def create_creative(account_id, payload: dict) -> {id}
  # POST /act_{id}/adcreatives
  # object_story_spec.page_id + link_data{image_hash|video_id, message, name, description, call_to_action{type, value{link}}, link}

async def create_ad(account_id, payload: dict) -> {id}
  # POST /act_{id}/ads
  # name, adset_id, creative{creative_id}, status=PAUSED, tracking_specs?
```

Each create method returns `{id, name, raw}` or raises `MetaApiError` (new exception class with `code`, `subcode`, `message`).

### 2.2 New API routes (apps/api/src/api/campaigns.py — extend existing router)

Read endpoints (used by wizard dropdowns):

```
GET  /campaigns/meta/pages                                     -> [{id, name, ig_id?}]
GET  /campaigns/meta/pages/{page_id}/instagram-accounts        -> [{id, username}]
GET  /campaigns/meta/accounts/{account_id}/custom-audiences    -> [{id, name, subtype, count}]
GET  /campaigns/meta/targeting/search?q=&type=                 -> [{key, name, type}]
GET  /campaigns/meta/targeting/interests?q=                    -> [{id, name, size_min, size_max}]
```

Draft CRUD:

```
POST   /campaigns/drafts                          body: {platform_account_id, name, client_name?, internal_naming?}
GET    /campaigns/drafts                          list current org
GET    /campaigns/drafts/{id}                     full payload incl. adsets[].ads[]
PATCH  /campaigns/drafts/{id}                     partial update (campaign_payload, step, status)
DELETE /campaigns/drafts/{id}

POST   /campaigns/drafts/{id}/adsets              body: AdSetDraft payload
PATCH  /campaigns/drafts/{id}/adsets/{adset_id}
DELETE /campaigns/drafts/{id}/adsets/{adset_id}

POST   /campaigns/drafts/{id}/adsets/{adset_id}/ads
PATCH  /campaigns/drafts/{id}/ads/{ad_id}
DELETE /campaigns/drafts/{id}/ads/{ad_id}

POST   /campaigns/drafts/{id}/media               multipart {file, kind=image|video} -> {hash|video_id, preview_url}
                                                  proxies upload to Meta /adimages or /advideos for selected account
```

Publish:

```
POST   /campaigns/drafts/{id}/publish             -> {success, campaign_id, adsets:[...], ads:[...], errors?:[]}
  # Server orchestrates: validate -> create_campaign -> for each adset create_adset -> for each ad create_creative+create_ad
  # Updates campaign_drafts.status to 'publishing' then 'published'|'failed'
  # Stores published ids back on draft rows
```

All routes use existing `_get_meta_adapter` helper and `get_current_org_id` dep. Validate every draft `org_id` against current org before mutating.

### 2.3 Schemas (Pydantic in `apps/api/src/api/campaigns.py` or split into `apps/api/src/schemas/campaigns.py`)

```python
class CampaignDraftBody(BaseModel):
    platform_account_id: str
    name: str
    client_name: Optional[str]
    internal_naming: Optional[str]
    objective: Optional[Literal['OUTCOME_TRAFFIC','OUTCOME_LEADS','OUTCOME_ENGAGEMENT','OUTCOME_SALES','OUTCOME_AWARENESS','OUTCOME_APP_PROMOTION']]
    buying_type: Literal['AUCTION','RESERVED'] = 'AUCTION'
    special_ad_categories: list[str] = []
    daily_budget: Optional[int]      # cents
    lifetime_budget: Optional[int]
    cbo_enabled: bool = False

class TargetingPayload(BaseModel):
    geo_locations: dict               # {countries:[], regions:[], cities:[]}
    age_min: int = 18
    age_max: int = 65
    genders: list[int] = []           # [] all, [1] male, [2] female
    interests: list[dict] = []        # [{id,name}]
    custom_audiences: list[dict] = []
    excluded_custom_audiences: list[dict] = []
    publisher_platforms: list[str] = ['facebook','instagram']
    facebook_positions: Optional[list[str]]
    instagram_positions: Optional[list[str]]

class AdSetDraftBody(BaseModel):
    name: str
    conversion_location: Literal['website','app','messenger','instant_form','calls','on_ad']
    optimization_goal: str
    billing_event: str
    bid_strategy: Literal['LOWEST_COST_WITHOUT_CAP','LOWEST_COST_WITH_BID_CAP','COST_CAP'] = 'LOWEST_COST_WITHOUT_CAP'
    bid_amount: Optional[int]
    daily_budget: Optional[int]
    lifetime_budget: Optional[int]
    targeting: TargetingPayload
    start_time: str                   # ISO
    end_time: Optional[str]
    pixel_id: Optional[str]
    custom_event_type: Optional[str]
    promoted_object: Optional[dict]   # for leads/conversion: {pixel_id, custom_event_type, page_id, application_id}

class AdDraftBody(BaseModel):
    name: str
    page_id: str
    instagram_actor_id: Optional[str]
    format: Literal['single_image','single_video','carousel']
    primary_text: str
    headline: str
    description: Optional[str]
    cta_type: str                     # SHOP_NOW, LEARN_MORE, SIGN_UP, ...
    destination_url: str
    media: list[dict]                 # [{kind:'image'|'video', hash?:str, video_id?:str, thumbnail_url?:str}]
    url_tags: Optional[str]           # UTM string
    tracking_specs: Optional[list[dict]]
```

### 2.4 OAuth scope expansion

File: `apps/api/src/api/auth_platforms.py` line ~26.

Add scopes: `pages_show_list,pages_read_engagement,instagram_basic,pages_manage_metadata`. Existing scopes (`ads_management,ads_read,business_management`) retained.

Edge function mirror: `supabase/functions/platforms-connect/index.ts`. Same scope list.

Also extend `supabase/functions/platforms-callback-meta/index.ts` if it parses scopes server-side.

---

## Phase 3 — Shared schemas (packages/schemas/src/entities.ts)

Append zod schemas mirroring Pydantic, exported for web consumption:

```ts
export const TargetingSchema = z.object({...});
export const CampaignDraftSchema = z.object({...});
export const AdSetDraftSchema = z.object({...});
export const AdDraftSchema = z.object({...});
export const PublishResultSchema = z.object({...});

export type CampaignDraft = z.infer<typeof CampaignDraftSchema>;
export type AdSetDraft = z.infer<typeof AdSetDraftSchema>;
export type AdDraft = z.infer<typeof AdDraftSchema>;
```

Constants module `packages/schemas/src/meta-constants.ts`:

```ts
export const META_OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App promotion' },
  { value: 'OUTCOME_SALES', label: 'Sales' },
];
export const CTA_TYPES = ['LEARN_MORE','SHOP_NOW','SIGN_UP','SUBSCRIBE','BOOK_TRAVEL','CONTACT_US','GET_QUOTE','APPLY_NOW','DOWNLOAD','GET_OFFER','MESSAGE_PAGE','WHATSAPP_MESSAGE'];
export const OPTIMIZATION_GOALS_BY_OBJECTIVE = { OUTCOME_LEADS: ['LEAD_GENERATION','OFFSITE_CONVERSIONS','QUALITY_LEAD'], ... };
export const BILLING_EVENTS = ['IMPRESSIONS','LINK_CLICKS','THRUPLAY'];
export const SPECIAL_AD_CATEGORIES = ['NONE','EMPLOYMENT','HOUSING','CREDIT','ISSUES_ELECTIONS_POLITICS'];
```

---

## Phase 4 — Web frontend

### 4.1 Extend `apps/web/lib/campaignsApi.ts`

Add methods, keep existing intact:

```ts
listMetaPages(): Promise<MetaPage[]>
listInstagramAccounts(pageId): Promise<IgAccount[]>
listCustomAudiences(accountId): Promise<CustomAudience[]>
searchTargeting(q, type): Promise<TargetingOption[]>
searchInterests(q): Promise<Interest[]>

createDraft(body): Promise<CampaignDraft>
listDrafts(): Promise<CampaignDraft[]>
getDraft(id): Promise<CampaignDraftFull>          // includes adsets[].ads[]
patchDraft(id, body): Promise<CampaignDraft>
deleteDraft(id): Promise<void>

addAdSet(draftId, body): Promise<AdSetDraft>
patchAdSet(draftId, adsetId, body): Promise<AdSetDraft>
deleteAdSet(draftId, adsetId): Promise<void>

addAd(draftId, adsetId, body): Promise<AdDraft>
patchAd(draftId, adId, body): Promise<AdDraft>
deleteAd(draftId, adId): Promise<void>

uploadMedia(draftId, file, kind): Promise<{hash?, video_id?, preview_url}>

publishDraft(draftId): Promise<PublishResult>
```

### 4.2 New components

Minimal primitives under `apps/web/components/ui/` (Tailwind, follows lamani-brand-design skill):

- `Button.tsx` — variants `primary | secondary | ghost | danger`, sizes `sm | md`
- `Input.tsx` — 36px height, label above, `text-xs text-zinc-500`
- `Select.tsx` — native select wrapped, lucide chevron
- `Textarea.tsx`
- `Combobox.tsx` — async search (used for interests, geo, custom audiences); debounced 250ms
- `Tabs.tsx` — wizard step indicator (3 tabs: Campaign / Ad sets / Ads)
- `MediaUpload.tsx` — drag-drop, image/video, calls `uploadMedia`, shows thumbnail
- `Card.tsx` — bordered container `rounded-md border border-zinc-200 dark:border-zinc-800`
- `EmptyState.tsx`

Wizard-specific under `apps/web/components/campaign-wizard/`:

- `WizardLayout.tsx` — sticky header (back arrow, draft name, save status), step tabs, footer with Back/Next/Save Draft
- `CampaignDraftContext.tsx` — provider with `draft`, `updateDraft`, `saveCampaign`, `addAdSet`, `updateAdSet`, `addAd`, `updateAd`, `publish`, `dirty`, `saving`
- `Step1Campaign.tsx` — fields: account select (limited to Lamanify), name, internal naming, client name, objective grid (radio cards w/ icons), special ad categories, advantage CBO toggle, daily/lifetime budget (if CBO)
- `Step2AdSet.tsx` — list of adsets (left rail), editor on right. Fields per adset:
  - Name
  - Conversion location (radio)
  - Performance goal / optimization goal (depends on objective)
  - Pixel + custom event (if conversion)
  - Audience: custom audiences multi-select, lookalike, location combobox, age slider, gender chips, detailed targeting (interests combobox), languages
  - Placements: Advantage+ vs Manual (FB/IG positions checkboxes)
  - Budget: daily vs lifetime, bid strategy, bid cap
  - Schedule: start/end datetime
- `Step3Ad.tsx` — per ad:
  - Identity: page select, IG account select
  - Format: tabs (Single image/video, Carousel)
  - Media upload (drag-drop, calls Meta upload via backend proxy)
  - Primary text, headline, description (char counters)
  - CTA select, destination URL, URL params
  - Tracking: pixel events (multi)
  - Live preview pane (right) — desktop FB feed + IG feed mock using inputs
- `PublishConfirmDialog.tsx` — summary + "Publish to Meta" action; shows progress per stage; on success route to `/campaigns?highlight=<id>`

### 4.3 New routes

- `apps/web/app/campaigns/new/page.tsx` — entry; reads `?draft=<id>` and bootstraps context
- `apps/web/app/campaigns/new/layout.tsx` (optional) — wraps with `<CampaignDraftProvider>`
- `apps/web/app/campaigns/drafts/page.tsx` — drafts list (resume / delete)

### 4.4 Hook into existing `/campaigns` page

File: `apps/web/app/campaigns/page.tsx`.

Add a "Create campaign" button in the page header next to Refresh. Style: primary button (`bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900`). On click, route to `/campaigns/new?account_id=<selectedAccountId>`.

Add a "Drafts" secondary link next to it routing to `/campaigns/drafts`.

No other changes to existing list.

### 4.5 Wizard UX details

- Auto-save: every 2s after edit (debounced) call `patchDraft`. Indicator in header: "Saved 2s ago" (`text-zinc-500 text-xs`).
- Step gating: cannot advance unless current step passes zod parse. Show inline errors.
- Persist `step` server-side so reloads restore to last step.
- Hierarchical left rail in Step 2/3: tree of adsets / ads with add/duplicate/delete; selected item edits in right panel.
- Naming convention helper: under campaign name, button "Apply naming convention" generates `{Client}_{Date}_{Objective}` from filled fields.
- Required scopes check: on wizard mount, call `/platforms/connect/meta` status; if scopes missing prompt re-connect with banner.

---

## Phase 5 — Implementation order

1. Migration + SQLAlchemy models (Phase 1).
2. Pydantic + zod schemas + meta constants (2.3 + 3).
3. Backend draft CRUD endpoints (no Meta calls yet) (2.2 draft + media stubs).
4. Backend Meta read endpoints: pages, IG, audiences, targeting search (2.2 reads + 2.1 read methods).
5. Backend Meta create methods + publish orchestrator (2.1 create + 2.2 publish).
6. Web `campaignsApi` extensions (4.1).
7. Web UI primitives in `components/ui/` (4.2 first batch).
8. Wizard layout + context + Step 1 (4.2 wizard + 4.3 routes for happy path).
9. Step 2 with targeting + audience pickers.
10. Step 3 with media upload + creative form + preview.
11. Drafts list page + Create campaign button on `/campaigns`.
12. Publish confirm dialog + result handling.
13. OAuth scope expansion + reconnect banner.

---

## Phase 6 — Verification

After each phase:
- `pnpm --filter @lamani/api dev` runs FastAPI locally on :8000.
- `pnpm --filter @lamani/web dev` runs Next.js on :3000.
- Test with real Lamanify account `123828087484282`. Use `status=PAUSED` everywhere on create so nothing goes live by accident.
- Final: type check `pnpm -w typecheck`, lint `pnpm -w lint` (confirm scripts in root `package.json` first; if missing, ask user for the commands and persist to `.trae/rules/project_rules.md`).

---

## Out of scope (v1)

- Approval gateway (`status=awaiting_client`, public review page, comments). Schema reserves columns; UI not built.
- Carousel format variations, dynamic creative, AB tests.
- Lead form builder (use existing forms picker only).
- Catalog / dynamic product ads.
- Google Ads parity.
- Bulk import / CSV.

These will be follow-up plans once core 3-step flow ships.

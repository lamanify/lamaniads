-- Campaign drafts hierarchy: drafts -> adsets -> ads
-- Backend (FastAPI) writes via service_role; RLS enabled with permissive service_role policy
-- and org-scoped policies for authenticated users (future client review use).

create type campaign_draft_status as enum (
  'draft',
  'ready_for_review',
  'awaiting_client',
  'approved',
  'publishing',
  'published',
  'failed'
);

create table campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  created_by uuid,
  platform text not null default 'meta',
  platform_account_id text not null,
  name text not null,
  client_name text,
  internal_naming text,
  status campaign_draft_status not null default 'draft',
  step int not null default 1,
  campaign_payload jsonb not null default '{}'::jsonb,
  client_review_token text unique,
  published_campaign_id text,
  publish_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_draft_adsets (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references campaign_drafts(id) on delete cascade,
  position int not null default 0,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  published_adset_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaign_draft_ads (
  id uuid primary key default gen_random_uuid(),
  adset_id uuid not null references campaign_draft_adsets(id) on delete cascade,
  position int not null default 0,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  published_ad_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaign_drafts_org_status_idx on campaign_drafts(org_id, status);
create index campaign_draft_adsets_draft_idx on campaign_draft_adsets(draft_id);
create index campaign_draft_ads_adset_idx on campaign_draft_ads(adset_id);
create index campaign_drafts_review_token_idx on campaign_drafts(client_review_token) where client_review_token is not null;

-- updated_at triggers
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger campaign_drafts_set_updated_at
  before update on campaign_drafts
  for each row execute function set_updated_at();

create trigger campaign_draft_adsets_set_updated_at
  before update on campaign_draft_adsets
  for each row execute function set_updated_at();

create trigger campaign_draft_ads_set_updated_at
  before update on campaign_draft_ads
  for each row execute function set_updated_at();

-- RLS: enabled, but backend uses service_role (bypasses RLS).
-- Public review token policy reserved for future client approval page.
alter table campaign_drafts enable row level security;
alter table campaign_draft_adsets enable row level security;
alter table campaign_draft_ads enable row level security;

-- Anonymous read-only access via client_review_token (used by future review page).
create policy campaign_drafts_review_token_select on campaign_drafts
  for select
  to anon
  using (
    client_review_token is not null
    and current_setting('request.jwt.claims', true)::jsonb ->> 'review_token' = client_review_token
  );

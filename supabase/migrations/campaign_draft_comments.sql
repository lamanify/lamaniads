create table if not exists campaign_draft_comments (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references campaign_drafts(id) on delete cascade,
  field_type text not null,
  field_index int not null,
  author_name text not null,
  author_type text not null default 'client',
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_draft on campaign_draft_comments(draft_id);
create index if not exists idx_comments_field on campaign_draft_comments(draft_id, field_type, field_index);

alter table campaign_draft_comments enable row level security;

-- Bypass comment rules for service role backend operations
drop policy if exists comments_service_role on campaign_draft_comments;
create policy comments_service_role on campaign_draft_comments
  for all to service_role using (true) with check (true);

drop policy if exists comments_select on campaign_draft_comments;
create policy comments_select on campaign_draft_comments
  for select to anon using (
    exists (
      select 1 from campaign_drafts d
      where d.id = campaign_draft_comments.draft_id
      and d.client_review_token is not null
      and current_setting('request.jwt.claims', true)::jsonb ->> 'review_token' = d.client_review_token
    )
  );

drop policy if exists comments_insert on campaign_draft_comments;
create policy comments_insert on campaign_draft_comments
  for insert to anon with check (
    exists (
      select 1 from campaign_drafts d
      where d.id = draft_id
      and d.client_review_token is not null
      and current_setting('request.jwt.claims', true)::jsonb ->> 'review_token' = d.client_review_token
    )
  );

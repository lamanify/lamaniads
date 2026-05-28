# Unified Ads MCP Platform PRD and Architecture Spec

## Document purpose
This document defines the product requirements and technical architecture for a minimal, AI-operable ads management platform that works across Meta Ads and Google Ads through a Model Context Protocol (MCP) server. The product is designed as a control plane with a narrow set of safe, high-value operations rather than a full replacement for the native ad platforms.[cite:67][cite:64][cite:38][cite:60]

## Product summary
The product is a multi-tenant web application plus MCP server that allows human users and AI agents to connect ad accounts, sync campaign and reporting data, generate proposed changes, and execute approved actions across Meta and Google Ads from one interface.[cite:38][cite:60][cite:67]

The design direction is minimal and operational, inspired by the clarity and density of modern product interfaces such as Vercel-style admin layouts and streamlined dashboard shells. The visual system should favor whitespace, compact tables, muted neutrals, restrained accent color, and command-palette-driven workflows.[cite:70][cite:71][cite:75]

## Product goals

### Primary goals
- Provide one control plane for Meta Ads and Google Ads management with a shared internal model and workflow.[cite:38][cite:60]
- Allow AI agents to operate safely through a constrained MCP tool surface rather than raw vendor APIs.[cite:67][cite:64]
- Support read-only reporting first, then draft-based mutations, then controlled execution with approvals and audit trails.[cite:67][cite:38][cite:60]
- Create an interface that is fast, calm, and low-noise, with a minimal product aesthetic suitable for operators managing multiple accounts.[cite:70][cite:71][cite:75]

### Non-goals for MVP
- Not a full replacement for Meta Ads Manager or Google Ads UI.[cite:38][cite:60]
- Not a generalized marketing data warehouse.[cite:38][cite:60]
- Not an autonomous optimization engine that makes unrestricted spend changes without approval.[cite:67][cite:64]
- Not a creative generation studio for images, copy, or landing pages in v1.

## Users and roles

### Primary users
- Performance marketers managing multiple accounts.
- Agency operators managing client ad accounts.
- Internal growth teams that want one reporting and action console.
- AI agents operating under human-defined policies via MCP.[cite:67][cite:64]

### Roles
- Owner: full access to org settings, billing, integrations, approvals, and logs.
- Admin: can manage accounts, configure policies, approve actions, and run tools.
- Operator: can view data, create drafts, and request approval for changes.
- Analyst: read-only reporting and export access.
- Agent: tool-scoped access through MCP with policy enforcement.[cite:67][cite:64]

## Problems to solve
- Meta and Google have different object hierarchies and reporting semantics, which makes cross-platform management inconsistent.[cite:38][cite:60]
- Native interfaces are optimized for each vendor separately, not for cross-account, cross-platform operations.[cite:38][cite:60]
- AI agents should not be given direct raw access to mutation-heavy ad APIs without validation, tool design, and approval layers.[cite:67][cite:64]
- Teams need a way to review and approve recommended changes before money is spent.

## Product principles
- One unified domain model, but preserve vendor-native fields for fidelity.[cite:38][cite:60]
- Readability over feature sprawl.
- Drafts before execution.
- Explicit approvals for risky actions.
- Every mutation must be attributable, logged, and replayable.
- The MCP server exposes business actions, not low-level transport details.[cite:67][cite:64]

## Functional scope

### MVP scope
1. Connect one or more Meta ad accounts and one or more Google Ads customers.[cite:38][cite:40]
2. Sync campaigns, ad sets or ad groups, ads, daily metrics, budgets, and statuses.[cite:38][cite:56][cite:60]
3. Display a unified campaigns table with filters by platform, account, status, spend, and performance.[cite:38][cite:60]
4. Show campaign detail pages with platform-native metadata and a normalized metrics panel.[cite:38][cite:60]
5. Support read-only reporting across date ranges.
6. Support draft actions for pausing campaigns and updating budgets.
7. Support approval workflows for those draft actions.
8. Execute approved changes through the platform adapters.
9. Log every action and payload diff.
10. Expose MCP tools for listing accounts, listing campaigns, pulling insights, creating drafts, and executing approved actions.[cite:67][cite:64]

### Post-MVP scope
- Create campaigns, ad sets or ad groups, ads, and creatives.[cite:38][cite:60]
- AI-generated optimization recommendations.
- Anomaly detection and pacing alerts.
- Rules engine for scheduled budget and status changes.
- Multi-step reporting builder.
- Cross-platform budget allocation planning.
- Slack, email, and webhook notifications.

## Cross-platform domain model
Meta uses ad account, campaign, ad set, and ad. Google uses customer, campaign, ad group, and ad.[cite:38][cite:56][cite:57][cite:60] The platform should normalize them into a canonical structure without losing native metadata.

### Canonical entities
| Canonical entity | Meta mapping | Google mapping | Notes |
|---|---|---|---|
| Organization | Business / internal tenant | Internal tenant | App-level concept |
| PlatformAccount | Ad Account | Customer | Connected account record [cite:38][cite:60] |
| Campaign | Campaign | Campaign | Shared top-level delivery object [cite:38][cite:60] |
| AdGroup | Ad Set | Ad Group | Normalized middle layer [cite:56][cite:60] |
| Ad | Ad | Ad | Delivery unit |
| Creative | Ad Creative | Assets / ad creative resources | Preserve native payload |
| MetricsDaily | Insights | Metrics / reports | Store normalized plus native fields |
| DraftAction | Proposed mutation | Proposed mutation | App-level workflow concept |
| ChangeLog | Mutation audit | Mutation audit | App-level workflow concept |

### Canonical fields
Common fields should include:
- `id`
- `org_id`
- `platform`
- `platform_account_id`
- `platform_entity_id`
- `name`
- `status`
- `objective`
- `budget_type`
- `budget_amount`
- `currency`
- `start_date`
- `end_date`
- `native_payload_json`
- `normalized_payload_json`
- `last_synced_at`

Metrics fields should include:
- `date`
- `impressions`
- `clicks`
- `spend`
- `ctr`
- `cpc`
- `conversions`
- `conversion_value`
- `roas`
- `platform_metrics_json`

## User stories

### Read-only stories
- As an operator, I can connect a Meta ad account and a Google Ads customer so that I can see campaigns from both platforms in one table.
- As an analyst, I can filter by platform, account, status, and date range so that I can compare campaign performance.
- As an operator, I can open a campaign detail page and see both normalized metrics and native metadata.
- As an admin, I can see sync status and job errors for each connected account.

### Draft and approval stories
- As an operator, I can ask the AI to pause underperforming campaigns, but the result is created as a draft first.
- As an admin, I can review a budget change draft, see the before and after diff, and approve or reject it.
- As an operator, I can see who approved a change and when it was executed.
- As an owner, I can set policy thresholds that require approval for risky changes.

### Agent stories
- As an AI agent, I can list accounts, campaigns, and performance metrics through MCP tools without touching raw vendor APIs directly.[cite:67][cite:64]
- As an AI agent, I can submit a draft action and receive a validation response and diff preview.
- As an AI agent, I cannot execute restricted changes without proper approval context.

## Information architecture
The web app should have a minimal, productivity-oriented navigation model.

### Primary navigation
- Overview
- Accounts
- Campaigns
- Drafts
- Reports
- Activity
- Settings

### Screen descriptions
- Overview: KPI row, alerts, sync health, pending approvals, recent activity.
- Accounts: connected platform accounts, connection status, scopes, sync controls.
- Campaigns: unified data table, filters, saved views, bulk selection.
- Campaign detail: metrics chart, dimensions, status controls, native metadata panel.
- Drafts: queued recommendations, diffs, approval actions.
- Reports: aggregated trends and breakdowns.
- Activity: audit logs, tool runs, sync logs, mutation history.
- Settings: org, users, permissions, API scopes, approval thresholds.

## UX and design spec
The UI should feel closer to Linear, Vercel, or a calm internal ops console than to a typical marketing dashboard. Vercel templates and dashboard shells are strong references for minimal Next.js patterns, while shadcn-oriented dashboard shells provide practical component direction.[cite:70][cite:71][cite:75][cite:81]

### Design goals
- Minimal and dense, but not cramped.
- One primary action per page.
- Compact navigation and command palette.
- Data-first tables with subtle color accents.
- Neutral surfaces, soft borders, restrained shadows.
- Clear dark mode and light mode support.

### Visual tokens
- Use neutral foundation colors and one restrained accent for interactive emphasis.
- Avoid loud gradients, colored icon circles, or heavy card chrome.
- Use 14 to 16px as the dominant UI text size and cap web app title scale at the equivalent of a modest page title, not landing-page display type, which aligns with product dashboard guidance.[cite:70][cite:75]
- Use tabular numerals for KPI and table values.

### Layout rules
- Left sidebar for persistent navigation.
- Sticky top command bar for search, date range, account switcher, and quick actions.
- Main content area with a single dominant scroll region.
- Table-first layout for campaigns and drafts.
- Side panels or sheets for review, detail, and approval actions.

### Component inventory
- Sidebar
- Top command bar
- Account switcher
- KPI strip
- Campaigns table
- Filter bar
- Metrics chart
- Status badge
- Draft diff panel
- Approval sheet
- Activity timeline
- Toasts for low-priority notices only
- Inline success or error states for mutations

### Interaction model
- Command palette for quick navigation and actions.
- Inline row actions for low-risk tasks.
- Approval sheet for risky tasks.
- Bulk actions through selection toolbar.
- Keyboard-friendly interactions.
- Skeleton states and calm empty states throughout.

## Technical architecture

### Top-level system
The system should be composed of:
1. Web app frontend.
2. API backend.
3. MCP server.
4. Adapter services for Meta and Google.
5. Background workers.
6. Postgres database.
7. Redis or queue backend.
8. Observability stack.

### Recommended stack
- Frontend: Next.js with App Router and TypeScript.
- UI: shadcn/ui plus Tailwind CSS for a minimal component system aligned with current Next.js dashboard patterns.[cite:70][cite:71][cite:75]
- Backend API: FastAPI or NestJS. FastAPI is especially practical if using Python SDKs for both ad platforms.[cite:42][cite:22]
- MCP server: standalone service in TypeScript or Python, depending on the main backend language.[cite:67][cite:64]
- Database: Postgres.
- Queue: Redis plus BullMQ, Celery, or equivalent.
- Auth: OAuth for Meta and Google, plus app-level session auth.
- Deployment: Dockerized services on a platform such as Coolify, Cloud Run, ECS, or Fly.io.

### Recommended monorepo layout
```text
/apps
  /web
  /api
  /mcp-server
/workers
  /sync-worker
  /mutation-worker
/packages
  /domain
  /schemas
  /meta-adapter
  /google-adapter
  /ui
  /config
/infrastructure
  /docker
  /terraform
/docs
```

## Service responsibilities

### Web app
- Render the operator UI.
- Call backend API for data, drafts, approvals, and logs.
- Provide command palette and review flows.

### Backend API
- Handle user auth and org access.
- Expose REST or GraphQL endpoints to the web app.
- Aggregate normalized data from Postgres.
- Create and manage draft actions.
- Trigger workers for sync and execution.

### MCP server
- Expose tool-based interface for AI agents.[cite:67][cite:64]
- Validate tool input with schemas.
- Resolve org and account context.
- Enforce policy checks.
- Return normalized, concise outputs.
- Route to backend services rather than directly to UI-specific code.

### Sync worker
- Pull entities and metrics from platform adapters.
- Handle pagination, retries, and backoff.
- Upsert normalized and native data.
- Emit sync events and logs.

### Mutation worker
- Execute approved platform mutations.
- Persist response payloads and diffs.
- Retry idempotently where safe.
- Mark draft states as executed or failed.

### Platform adapters
- Encapsulate vendor auth, API calls, pagination, and field mappings.
- Expose shared methods like `listCampaigns`, `getCampaign`, `getInsights`, `pauseCampaign`, and `updateBudget`.
- Preserve vendor-native payloads.[cite:38][cite:60]

## MCP spec for this product
MCP is best used here as a constrained action surface for AI agents rather than a raw mirror of third-party APIs.[cite:67][cite:64] The server should expose a small set of business tools that align to operator intent.

### MCP tool catalog
| Tool | Purpose | Risk level |
|---|---|---|
| `list_accounts` | Return connected accounts with platform and health status | Low |
| `list_campaigns` | Return campaigns by account, platform, filters | Low |
| `get_campaign` | Return normalized plus native campaign detail | Low |
| `get_insights` | Return normalized metrics by entity and date range | Low |
| `list_drafts` | Return pending drafts and statuses | Low |
| `create_draft_pause_campaign` | Create pause action draft | Medium |
| `create_draft_update_budget` | Create budget change draft | High |
| `approve_draft` | Approve a draft if caller has permission | High |
| `execute_approved_draft` | Execute approved draft | High |
| `sync_account` | Trigger account sync | Medium |
| `get_activity_log` | Return audit log items | Low |

### Tool design rules
- Every tool input must have a JSON schema.
- Every tool output must be concise and normalized.
- Unsafe operations must never bypass approval rules.
- Tool names should be business-oriented, not vendor-specific.
- Vendor-specific detail should be passed via `platform` and optional `native_fields` arguments.

### Example tool schema
```json
{
  "name": "create_draft_update_budget",
  "description": "Create a budget change draft for a campaign",
  "inputSchema": {
    "type": "object",
    "properties": {
      "platform": { "type": "string", "enum": ["meta", "google"] },
      "campaign_id": { "type": "string" },
      "new_budget_amount": { "type": "number" },
      "currency": { "type": "string" },
      "reason": { "type": "string" }
    },
    "required": ["platform", "campaign_id", "new_budget_amount"]
  }
}
```

## Data architecture

### Database choice
Postgres is recommended because the product needs relational integrity for organizations, users, permissions, drafts, and logs, while also storing flexible native payloads in JSONB.

### Core tables
```text
organizations
users
memberships
platform_connections
platform_accounts
campaigns
ad_groups
ads
creatives
metrics_daily
sync_jobs
draft_actions
approvals
change_logs
activity_events
agent_sessions
policy_rules
```

### Example table details
#### `platform_connections`
- `id`
- `org_id`
- `platform`
- `oauth_subject`
- `access_token_encrypted`
- `refresh_token_encrypted`
- `token_expires_at`
- `scopes_json`
- `status`
- `created_at`
- `updated_at`

#### `campaigns`
- `id`
- `org_id`
- `platform`
- `platform_account_id`
- `platform_campaign_id`
- `name`
- `status`
- `objective`
- `budget_amount`
- `budget_type`
- `currency`
- `start_date`
- `end_date`
- `normalized_payload_json`
- `native_payload_json`
- `last_synced_at`
- `created_at`
- `updated_at`

#### `draft_actions`
- `id`
- `org_id`
- `created_by_type`
- `created_by_user_id`
- `created_by_agent_id`
- `platform`
- `entity_type`
- `entity_id`
- `action_type`
- `before_json`
- `after_json`
- `validation_json`
- `risk_level`
- `status`
- `approval_required`
- `approved_by_user_id`
- `approved_at`
- `executed_at`
- `execution_result_json`
- `created_at`
- `updated_at`

#### `change_logs`
- `id`
- `org_id`
- `draft_action_id`
- `platform`
- `entity_type`
- `entity_id`
- `actor_type`
- `actor_id`
- `change_summary`
- `payload_diff_json`
- `status`
- `created_at`

## API design
Use internal APIs that mirror product workflows rather than vendor endpoints.

### Example endpoints
- `GET /api/accounts`
- `POST /api/accounts/connect/meta`
- `POST /api/accounts/connect/google`
- `POST /api/accounts/{id}/sync`
- `GET /api/campaigns`
- `GET /api/campaigns/{id}`
- `GET /api/campaigns/{id}/insights`
- `POST /api/drafts/pause-campaign`
- `POST /api/drafts/update-budget`
- `POST /api/drafts/{id}/approve`
- `POST /api/drafts/{id}/execute`
- `GET /api/drafts`
- `GET /api/activity`
- `GET /api/policies`
- `PUT /api/policies`

## Integration spec

### Meta adapter
Use Meta Marketing API and official Business SDK or sample references to implement auth, campaign reads, ad set reads, ad reads, insights, and campaign mutations.[cite:38][cite:42][cite:43][cite:56][cite:57]

Adapter responsibilities:
- OAuth and token refresh.
- Read ad accounts.
- Read campaigns, ad sets, ads, and insights.
- Pause or resume campaign-level entities.
- Update budgets where supported.
- Normalize statuses and objectives.

### Google adapter
Use the official Google Ads API client libraries and campaign model documentation to implement customer discovery, campaign reads, ad group reads, metrics, and mutations.[cite:32][cite:40][cite:22][cite:60]

Adapter responsibilities:
- OAuth and refresh handling.
- Read customers.
- Read campaigns, ad groups, ads, and metrics.
- Pause or enable campaigns.
- Update campaign budgets through supported mutation paths.
- Normalize statuses and objectives.

### Adapter interface
```ts
interface AdsPlatformAdapter {
  listAccounts(connectionId: string): Promise<PlatformAccount[]>;
  listCampaigns(accountId: string, filters?: CampaignFilters): Promise<Campaign[]>;
  getCampaign(accountId: string, campaignId: string): Promise<Campaign>;
  getInsights(params: InsightsQuery): Promise<MetricsDaily[]>;
  pauseCampaign(accountId: string, campaignId: string): Promise<MutationResult>;
  updateBudget(accountId: string, campaignId: string, amount: number): Promise<MutationResult>;
  syncAccount(accountId: string): Promise<SyncResult>;
}
```

## Sync model

### Sync types
- Initial full sync.
- Incremental entity sync.
- Daily metrics sync.
- Manual sync by account.
- Scheduled sync.

### Scheduling guidance
- Account and campaign metadata: every 15 to 60 minutes.
- Daily metrics backfill: hourly for recent windows, daily for older windows.
- Manual sync available in UI and MCP.

### Sync flow
1. Queue sync job.
2. Resolve connection and adapter.
3. Pull platform accounts.
4. Pull campaigns and middle-layer entities.
5. Pull recent metrics.
6. Upsert normalized records.
7. Store native payload snapshots.
8. Emit activity event.
9. Update sync health status.

## Draft and approval system
This system is central to safe AI operation.

### Draft lifecycle
- `created`
- `validated`
- `awaiting_approval`
- `approved`
- `executing`
- `executed`
- `failed`
- `rejected`
- `expired`

### Approval policy examples
- Pausing a campaign may require approval only for high-spend campaigns.
- Budget increases above a threshold always require approval.
- Budget decreases may be auto-approved if below threshold.
- Entity creation actions always require approval in MVP.

### Diff model
Every draft should display:
- Current value.
- Proposed value.
- Relative percentage change.
- Risk flag.
- Policy reason for required approval.

## Security and compliance

### Security requirements
- Encrypt provider tokens at rest.
- Never expose raw provider tokens to frontend or MCP clients.
- Enforce org-level scoping in every query and tool.
- Validate all mutation payloads server-side.
- Sign and log all approvals.
- Support least-privilege role assignment.

### Auditability
- Every mutation must generate a change log.
- Every approval must be attributed to a human user.
- Every agent-initiated action must be traceable to an agent session.
- Keep request and response payload summaries for debugging, excluding secrets.

## Error handling

### Principles
- Vendor API failures should surface as structured platform errors.
- Partial syncs should be visible and retryable.
- Failed mutations should not remain ambiguously pending.
- UI should explain whether the issue is app-side, auth-side, policy-side, or vendor-side.

### Error classes
- Authentication expired.
- Missing permissions.
- Invalid campaign state.
- Rate-limited.
- Validation failed.
- Network timeout.
- Internal mapping failure.

## Observability
- Structured logs for API, sync worker, mutation worker, and MCP server.
- Metrics for sync durations, mutation success rate, tool call frequency, queue depth, and platform error rates.
- Tracing across MCP to API to worker to adapter path.
- Alerting for sync failures, repeated mutation failures, and token expiry spikes.

## Performance requirements
- Campaigns table initial render under 2 seconds for common views with cached data.
- Command palette open response under 100ms locally perceived.
- Sync dashboard status updates within seconds of job completion.
- Insights queries should use cached normalized data by default, with optional force refresh.

## Frontend engineering spec

### App structure
- Next.js App Router.
- Server components for layout and initial data hydration.
- Client components only where interactivity is required.
- Typed API client generated from backend schemas if practical.

### UI library
Use shadcn/ui as the component foundation because it supports a minimal, editable component model and aligns well with Vercel-like product interfaces and dashboard shells.[cite:70][cite:75][cite:81]

### Required UI states
Every screen must support:
- Loading skeletons.
- Empty states.
- Error states.
- Success confirmations.
- Permission-restricted states.
- Dark mode and light mode.

### Table behavior
Campaigns and drafts tables should support:
- Sort.
- Filter.
- Save view.
- Multi-select.
- Keyboard navigation.
- Sticky header.
- Density toggle if needed.

## Backend engineering spec

### API layer
- Typed request and response models.
- Central auth middleware.
- Org scoping middleware.
- Role and policy checks.
- Adapter service abstraction.
- Queue dispatch for expensive jobs.

### Worker layer
- Idempotent jobs.
- Exponential backoff.
- Dead-letter handling.
- Visibility into failed records.

### Schema validation
Use a schema system such as Pydantic or Zod on all ingress points, especially MCP tool inputs and mutation payloads.

## Deployment architecture

### Environment separation
- Local
- Staging
- Production

### Service deployment
- `web`
- `api`
- `mcp-server`
- `sync-worker`
- `mutation-worker`
- `postgres`
- `redis`

### Suggested runtime model
- Containerize all services.
- Use background workers separate from web traffic.
- Put secrets in a managed secret store.
- Use managed Postgres where possible.

## Roadmap

### Milestone 1: Foundation
- Monorepo setup.
- Auth and org model.
- Postgres schema.
- Basic Next.js shell.
- MCP server skeleton.[cite:67][cite:64]

### Milestone 2: Read-only platform integration
- Meta OAuth and account sync.[cite:38][cite:42]
- Google OAuth and customer sync.[cite:32][cite:40]
- Campaigns table and detail pages.
- Metrics sync and normalized reporting.

### Milestone 3: Draft actions
- Draft model and approval workflow.
- Pause campaign draft.
- Budget update draft.
- Diff viewer.
- Audit log.

### Milestone 4: Execution
- Approved draft execution worker.
- Activity timeline.
- Retry and failure handling.
- Policy thresholds.

### Milestone 5: Agent workflows
- Agent session tracking.
- Enhanced MCP tools.
- Prompt-safe system messages and tool descriptions.
- Recommendation generation and review UX.

## Acceptance criteria

### MVP acceptance criteria
- A user can connect at least one Meta account and one Google Ads customer successfully.[cite:38][cite:40]
- The system syncs campaigns and daily metrics from both platforms.[cite:38][cite:60]
- The campaigns screen shows a unified table with platform filters.
- A user or agent can create a draft to pause a campaign.
- A user or agent can create a draft to update a budget.
- An admin can approve or reject a draft.
- The system can execute an approved draft and log the result.
- The MCP server exposes the planned low-risk and approval-gated tools.[cite:67][cite:64]
- Every mutation is visible in the activity log.

## Risks and mitigations

### Risk: cross-platform abstraction leaks
Mitigation: preserve vendor-native fields and show native detail panels.[cite:38][cite:60]

### Risk: unsafe AI actions
Mitigation: drafts, approvals, policy engine, tool scoping, and execution limits.[cite:67][cite:64]

### Risk: token expiry and permissions drift
Mitigation: token health checks, connection diagnostics, proactive alerts.

### Risk: reporting mismatches between platforms
Mitigation: normalized metrics definitions plus native metrics access and explicit labeling.[cite:38][cite:60]

### Risk: rate limits and sync delays
Mitigation: incremental syncs, backoff, caching, and retry queues.

## Build brief for an AI coding agent
Use this as the implementation brief:

- Build a multi-tenant web app and remote MCP server for unified Meta Ads and Google Ads operations.
- Use Next.js plus shadcn/ui for a minimal Vercel or Linear style UI.[cite:70][cite:71][cite:75][cite:81]
- Use FastAPI or equivalent backend with Postgres and Redis.
- Implement adapter packages for Meta Marketing API and Google Ads API using official SDKs and docs.[cite:42][cite:43][cite:22][cite:32][cite:38][cite:60]
- Normalize campaign data into shared tables while preserving native payloads.
- Implement read-only sync first.
- Implement drafts and approvals before any direct mutation execution.
- Expose a small MCP tool catalog for account listing, campaign listing, insights, draft creation, approval, execution, and sync.[cite:67][cite:64]
- Enforce policy-based approval for risky actions.
- Produce a calm, table-first product UI with command palette, sidebar navigation, and sheet-based review flows.

## Resource list for implementation
- MCP specification and protocol reference.[cite:67][cite:61]
- Cloudflare MCP deployment guidance and remote MCP patterns.[cite:64]
- Meta Marketing API docs.[cite:38]
- Meta campaign and ad set references.[cite:56][cite:57]
- Meta Business SDK for Python and sample repos.[cite:42][cite:43]
- Google Ads API docs and client libraries.[cite:40][cite:32][cite:22][cite:60]
- Vercel dashboard templates and Next.js admin references.[cite:70][cite:71]
- shadcn dashboard shell patterns and admin inspirations.[cite:75][cite:81]

## Recommended first sprint backlog
1. Create monorepo and CI setup.
2. Set up Postgres schema and migrations.
3. Build auth, orgs, and roles.
4. Scaffold Next.js app shell with sidebar and top bar.
5. Scaffold MCP server with one health tool.
6. Implement Meta OAuth and account discovery.
7. Implement Google OAuth and customer discovery.
8. Implement normalized `platform_accounts` and `campaigns` sync.
9. Build campaigns table and account filters.
10. Add draft action schema and approval screen.

## Decision summary
The most workable implementation is a narrow, approval-gated ads control plane with a shared domain model, a minimal dashboard UI, and an MCP server that exposes safe business tools instead of raw ad platform APIs. That architecture is compatible with both Meta and Google Ads, practical for AI-assisted operations, and realistic to ship incrementally.[cite:67][cite:64][cite:38][cite:60]

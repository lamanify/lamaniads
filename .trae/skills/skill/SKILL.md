---
name: Skill
description: General skills
---

# Project Skills

This project uses a small set of focused skills to keep AI agents consistent, safe, and implementation-ready.

## Core skill set

### 1. `mcp`
Use for:
- Designing MCP servers
- Defining tools and tool schemas
- Planning tool discovery and tool naming
- Validation, auth, safety, and approval-gated tool execution
- Structuring business-oriented tools instead of raw API passthroughs

Rules:
- Keep the tool surface small and discoverable.
- Use descriptive, service-prefixed tool names.
- Use strict JSON Schema for all tool inputs.
- Keep tools atomic and outcome-oriented.
- Return concise, normalized results.
- Never expose raw Meta or Google mutation surfaces directly to MCP.
- Log tool usage and enforce authorization.
- Use approval flows for risky actions.
- Design for read-only first, mutations later.

### 2. `webapp`
Use for:
- Next.js frontend architecture
- Minimal dashboard layout
- Vercel / Linear style UI
- Sidebar, topbar, tables, sheets, command palette
- Responsive and dark mode design
- Loading, empty, error, approval, and audit states

Rules:
- Favor table-first product UI.
- Keep the visual language minimal and calm.
- Use a restrained accent palette.
- Prefer compact, high-density layouts over marketing-style layouts.
- Design for operators, not landing pages.
- Preserve strong keyboard and mobile behavior.
- Use clear visual hierarchy and low-noise components.

### 3. `fastapi-backend`
Use for:
- API structure
- Auth and RBAC
- Org-scoped request handling
- PostgreSQL models and migrations
- Queue integration
- Sync and mutation orchestration
- Health checks and observability

Rules:
- Keep the backend modular.
- Use typed request and response schemas.
- Separate API, workers, and adapters.
- Add middleware for auth, org scope, logging, and policy checks.
- Make sync and mutation flows idempotent.
- Expose internal APIs that mirror product workflows, not vendor APIs.

### 4. `ads-platform-integrations`
Use for:
- Meta Ads integration
- Google Ads integration
- Campaign sync
- Reporting sync
- Mutation adapters
- Platform-specific mapping and normalization

Rules:
- Preserve vendor-native payloads.
- Normalize into shared internal domain models.
- Keep Meta and Google adapters separate.
- Do not assume object hierarchies are identical.
- Handle rate limits, token refresh, and permission failures explicitly.
- Support read-only sync before write actions.

### 5. `domain-modeling`
Use for:
- Canonical entity design
- Shared vocabulary across platforms
- Internal schema and DB design
- Drafts, approvals, audit logs, activity logs
- State machines and lifecycle definitions

Rules:
- Use one shared internal model for cross-platform concepts.
- Preserve platform-specific fields in JSON alongside normalized fields.
- Model lifecycle states explicitly.
- Keep domain objects stable and reusable.
- Do not overfit the schema to one ad platform.

### 6. `repo-scaffolding`
Use for:
- Monorepo structure
- Folder layout
- Package boundaries
- Code generation order
- Ticket decomposition
- First-commit planning

Rules:
- Scaffold only what the first implementation wave needs.
- Keep service boundaries clear.
- Make dependencies explicit.
- Avoid premature abstraction.
- Optimize for multiple AI agents working in parallel.

### 7. `observability-and-ops`
Use for:
- Logging
- Metrics
- Tracing
- Alerting
- Retry logic
- Failure handling
- Auditability
- Production readiness

Rules:
- Log all mutations and sync jobs.
- Make failures explainable.
- Use structured logs.
- Add health endpoints to every service.
- Keep operational boundaries visible in code and docs.

---

## Skill interaction rules

### When to load `mcp`
Load this skill whenever the task involves:
- MCP server planning
- MCP tool design
- MCP implementation
- Agent tool safety
- Tool naming or schema design

### When to load `webapp`
Load this skill whenever the task involves:
- Dashboard UI
- Web app structure
- Frontend component design
- Design system decisions
- Responsive behavior
- Visual polish for the product shell

### When to load `fastapi-backend`
Load this skill whenever the task involves:
- API service planning
- Authentication and authorization
- Data models
- Migrations
- Workers
- Queue setup
- Backend architecture

### When to load `ads-platform-integrations`
Load this skill whenever the task involves:
- Meta Ads APIs
- Google Ads APIs
- OAuth and token refresh
- Syncing accounts, campaigns, ad groups, ads, metrics
- Mutation adapters and platform-specific rules

### When to load `domain-modeling`
Load this skill whenever the task involves:
- Canonical entities
- Data normalization
- Draft and approval workflows
- Audit logs
- Shared internal schemas
- State transitions

### When to load `repo-scaffolding`
Load this skill whenever the task involves:
- Breaking the project into phases
- Creating repo structure
- Ticket planning
- First commit planning
- Agent work distribution

### When to load `observability-and-ops`
Load this skill whenever the task involves:
- Logging
- Monitoring
- Metrics
- Error handling
- Runbooks
- Production deployment readiness

---

## Project-specific implementation rules

- Build a calm, minimal product, closer to Linear or Vercel than to a typical ads dashboard [web:125][web:93].
- Prefer a small number of high-value MCP tools over a large raw API surface [web:119][web:109][web:124].
- Use official or reputable full-stack starter patterns where helpful, especially Next.js + FastAPI + Postgres structures [web:103][web:105][web:127].
- Keep the frontend and backend strongly typed and schema-driven.
- Separate read-only sync from mutation execution.
- Separate draft generation from approval and execution.
- Always preserve audit logs and change history.
- Never store or expose production credentials in scaffolding.
- Never let AI agents mutate budgets or campaigns without the draft and approval pipeline.
- Keep the first version small enough to run locally and demo reliably.

---

## Recommended default skill loading order

1. `repo-scaffolding`
2. `domain-modeling`
3. `fastapi-backend`
4. `mcp`
5. `webapp`
6. `ads-platform-integrations`
7. `observability-and-ops`

The AI should load only the skills relevant to the current task, not all of them at once.

## Definition of done for skill use

A skill is being used correctly when:
- it reduces ambiguity,
- it improves consistency,
- it creates clearer implementation boundaries,
- and it helps the agent produce code or plans that are safe to execute.
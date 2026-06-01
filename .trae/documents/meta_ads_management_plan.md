# LamaniAds Control Plane - Campaign Management Plan

## Goal
Manage Lamanify's Meta Ads campaigns from the control plane using the `admin@lamanify.com` connection.

## Current State Analysis
- **OAuth Setup**: Complete (Endpoints `/connect/meta` and `/callback/meta` are implemented).
- **Meta API Adapter**: Implemented (`apps/api/src/core/meta_adapter.py`) using `https://graph.facebook.com/v19.0`.
- **Supported Endpoints via Adapter**:
  - `list_accounts`: Fetch Ad Accounts associated with the connection.
  - `list_campaigns`: Fetch campaigns (ID, name, status, objective, budget, buying_type).
  - `get_insights`: Fetch performance metrics (impressions, clicks, spend, conversions).

## Execution Plan

### Step 1: Verify Database Connection State
- Query the `platform_connections` table in Supabase to ensure the token for `admin@lamanify.com` (associated with the relevant `org_id`) exists and is marked as `active`.
- *Required action*: Use the `manage_core_memory` tool or remote DB query tools to verify if needed, or rely on API endpoints to list connections.

### Step 2: Test Ad Account Retrieval
- Utilize the `MetaAdsAdapter.list_accounts()` method (via the corresponding API endpoint, e.g., `GET /api/accounts`) to fetch the Ad Account ID(s) associated with Lamanify.

### Step 3: Fetch Campaigns & Insights
- Once the `account_id` is identified, use the `GET /api/campaigns` endpoint or directly invoke `list_campaigns` to retrieve the current active/paused campaigns.
- Fetch metrics using `get_insights` to present a dashboard view of Spend, Impressions, Clicks, and Conversions.

### Step 4: Implement Campaign Management (Drafts & Mutations)
Currently, the adapter only reads data. To fully *manage* campaigns, we need to implement mutation endpoints.
- **Implement Pause/Resume**: Add `pauseCampaign` logic to `MetaAdsAdapter`.
- **Implement Budget Update**: Add budget mutation logic.
- **Implement API Routes**: Ensure `/api/drafts/pause-campaign`, `/api/drafts/update-budget`, and execution endpoints are wired up to the adapter.

### Step 5: UI Integration
- Update the Frontend (`apps/web/app/campaigns/page.tsx` or similar) to consume these endpoints, allowing the user to view Lamanify's campaigns and submit changes (Drafts).

## Summary of Data Available
Through this connection, we can retrieve:
1. **Account Level**: Account Name, ID, Status.
2. **Campaign Level**: Campaign ID, Name, Status (Active/Paused), Objective, Daily Budget, Buying Type.
3. **Insights (Performance)**: Spend, Impressions, Clicks, Conversions.
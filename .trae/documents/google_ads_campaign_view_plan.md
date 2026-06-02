# Plan - Google Ads Campaign View Integration

This plan outlines the design and implementation steps to add a dedicated Google Ads campaign view in the `LamaniAds` web application, matching the layout of the existing Meta Ads campaigns view while incorporating the Google Ads hierarchy and specific metrics.

---

## 1. Goal
Add a Google Ads campaign view to `apps/web/app/campaigns/page.tsx` that maintains a similar hierarchical, clean layout as Meta Ads, supporting the specific metrics and columns unique to Google Ads.

---

## 2. Technical Scope

### A. Core Frontend Types (`apps/web/lib/campaignsApi.ts`)
1. Extend `LiveInsights` to encompass Google Ads metrics:
   - `search_impression_share?: number`
   - `search_lost_is_budget?: number`
   - `search_lost_is_rank?: number`
   - `avg_cpc?: number`
   - `quality_score?: number`
   - `avg_position?: number`
   - `impressions_search?: number`
   - `clicks_search?: number`
   - `conversion_value?: number`
   - `reach?: number` (Ensure fallback values are handled)
2. Extend `LiveCampaign` payload properties or support a `platform` differentiator.
3. Update `campaignsApi` methods to accept a `platform` query parameter where appropriate (e.g. `/campaigns/live/accounts?platform=google`).

### B. Backend Adaptations (`apps/api/src/api/campaigns.py` & `google_adapter.py`)
1. Introduce a helper `_get_google_adapter(org_id, db)` in `campaigns.py` similar to `_get_meta_adapter`.
2. Adapt `/campaigns/live/accounts` and `/campaigns/live` backend endpoints to support a `platform` query parameter (`meta` or `google`).
3. Update `GoogleAdsAdapter.get_insights` and `list_campaigns` in `google_adapter.py` to retrieve the rich set of metrics from the Google Ads Search API, normalizing them to match the extended canonical schema.

### C. Frontend Layout & UI Update (`apps/web/app/campaigns/page.tsx`)
1. **Platform Tabs/Selector**:
   - Add a platform picker (Meta Ads vs Google Ads) at the top header or side filter bar.
   - Persist user preference for active platform in local storage or state.
2. **Account Switching**:
   - Fetch accounts filtered by platform.
   - Maintain separate dropdown/bootstrap mechanisms for Meta vs Google.
3. **Table Columns Setup**:
   - Configure dynamic headers for Google Ads campaigns showing:
     - Name / Hierarchy
     - Status
     - Spend
     - Impressions
     - Reach
     - Clicks
     - CTR
     - CPC
     - Conversions (Leads)
     - Conversion Rate
     - Cost Per Lead (CPL)
     - Frequency
     - Search Imp. Share
     - Search Lost IS (Budget)
     - Search Lost IS (Rank)
     - Avg. CPC
     - Quality Score
     - Avg. Position
     - Imp. (Search)
     - Clicks (Search)
     - Conversion Value
     - Actions (Pause/Resume)
4. **Hierarchical Rendering**:
   - Support expanding campaigns into Google Ad Groups (similar to Meta Ad Sets) and Ads.
5. **Column Configuration (Visibility Settings)**:
   - Update the Column dropdown list to match the Google Ads available columns, allowing users to toggle columns and avoid table clutter.

---

## 3. Implementation Steps

### Step 1: Backend API Extension
- Implement helper method to resolve `GoogleAdsAdapter` using database decrypted credentials.
- Add route parameters to distinguish Meta / Google accounts and live stats.
- Extend `GoogleAdsAdapter.get_insights` to query the requested Google metrics via Google Ads search endpoints.

### Step 2: Frontend Types & API Client Upgrade
- Update typescript types in `apps/web/lib/campaignsApi.ts`.
- Add support in `campaignsApi` calls to request metrics from both Google Ads and Meta Ads endpoints.

### Step 3: Frontend View State & Platform Toggles
- Introduce `activePlatform` state ('meta' | 'google') to campaigns page.
- Load accounts and campaigns conditionally based on the chosen platform.
- Filter local states (`selectedAccountId`, `campaigns`, `campaignInsights`) appropriately.

### Step 4: Render Google Ads Layout in `page.tsx`
- Implement conditional table rendering:
  - If `activePlatform === 'meta'`, render the current Meta headers and rows.
  - If `activePlatform === 'google'`, render the new Google table featuring all the requested columns (Spend, Impressions, Reach, Clicks, CTR, CPC, Conversions, Conversion Rate, CPL, Frequency, Search IS, Search Lost IS (budget), Search Lost IS (rank), Avg. CPC, Quality Score, Avg. Position, Search Impressions, Search Clicks, and Conversion Value).
- Implement column formatting helper (e.g. formatting percentages for CTR/Conversion Rate, currency for Spend/CPC/Avg CPC, integer for Impressions/Clicks, etc.).

### Step 5: Test & Verify
- Ensure dashboard remains functional on platform switch.
- Verify API requests successfully fetch platform-specific accounts and performance metrics.

# Google Ads Campaign Builder Plan

## Overview
Implement a Google Ads campaign creation wizard following the standard Google Ads setup flow. This wizard will be integrated into the existing Lamanify Ads platform under the "Build" mode for Google platform.

## Proposed Setup Flow
1. **Step 1: Campaign Configuration**
   - Pick the campaign goal (e.g., Sales, Leads, Website traffic, Brand awareness).
   - Choose the campaign type (e.g., Search, Display, Performance Max, Video).
   - Set location, language, and budget.
   - Set conversion tracking options.

2. **Step 2: Ad Groups & Targeting**
   - Create the ad group.
   - Add keywords (match types) or audience targeting (demographics, segments).

3. **Step 3: Ads & Review**
   - Write the ad (Headlines, Descriptions, Final URLs, Extensions).
   - Review all settings.
   - Launch (Publish).

## Detailed Implementation Steps

### 1. Schema & Type Updates
- Update `packages/schemas/src/entities.ts` (and any Python backend schemas like `drafts.py`) to support Google Ads specific fields in the `campaign_payload`, `AdSetDraftPayload` (mapped to Ad Group), and `AdDraftPayload` (mapped to Google Ad components).
- Ensure `TargetingSchema` supports Google-specific targeting (e.g., keywords, specific demographics, language).

### 2. Backend (FastAPI) Enhancements
- Expand `GoogleAdsAdapter` in `apps/api/src/core/google_adapter.py` to support publishing logic for Google campaigns (or handle draft-to-publish translations).
- Ensure `apps/api/src/api/campaigns.py` correctly handles draft operations seamlessly for the Google platform (it currently handles drafts generically, but might need platform specific validations).

### 3. Frontend Architecture & Routing
- Update `apps/web/app/campaigns/page.tsx` to launch the builder for Google Ads (currently it shows "Google Ads Integration Required" for the build tab). Ensure it redirects to `/campaigns/new?account_id=...&platform=google`.
- Update `apps/web/app/campaigns/new/page.tsx` to render either the `CampaignWizardContext` (Meta) or a new `GoogleWizardContext` (or a unified one with platform logic).

### 4. Frontend Wizard Components
- Create `Step1GoogleCampaign.tsx`: Goal selection, Campaign Type, Location/Language, Budget, and Conversion Tracking.
- Create `Step2GoogleAdGroup.tsx`: Ad Group naming, Keyword input/generation, Audience demographics.
- Create `Step3GoogleAd.tsx`: Responsive Search Ad / Display Ad inputs (Headlines, Descriptions, URLs), and the final Review/Launch screen.

### 5. Integration and Polish
- Hook up the components to `campaignsApi.ts` draft endpoints.
- Apply Lamanify design system (using `Card`, `Input`, `Select`, etc.).
- Add client-side validations to ensure Google Ads constraints are met (e.g., character limits for headlines/descriptions).

import { z } from 'zod';

export const PlatformEnum = z.enum(['meta', 'google']);
export type Platform = z.infer<typeof PlatformEnum>;

export const StatusEnum = z.enum(['active', 'paused', 'deleted', 'archived', 'error']);
export type Status = z.infer<typeof StatusEnum>;

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const PlatformAccountSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  platform: PlatformEnum,
  platform_account_id: z.string(),
  name: z.string(),
  status: StatusEnum,
  last_synced_at: z.date().optional(),
});

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  platform: PlatformEnum,
  platform_account_id: z.string(),
  platform_campaign_id: z.string(),
  name: z.string(),
  status: StatusEnum,
  budget_amount: z.number(),
  currency: z.string(),
  native_payload: z.record(z.any()),
  normalized_payload: z.record(z.any()),
  last_synced_at: z.date(),
});

export const DraftActionSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  platform: PlatformEnum,
  entity_id: z.string(),
  action_type: z.enum(['pause_campaign', 'update_budget']),
  status: z.enum(['created', 'awaiting_approval', 'approved', 'executed', 'failed', 'rejected']),
  before_payload: z.record(z.any()),
  after_payload: z.record(z.any()),
  created_at: z.date(),
});

export const CampaignDraftStatusEnum = z.enum([
  'draft',
  'ready_for_review',
  'awaiting_client',
  'approved',
  'publishing',
  'published',
  'failed'
]);

export const CampaignDraftSchema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  created_by: z.string().uuid().nullable().optional(),
  platform: z.string().default('meta'),
  platform_account_id: z.string(),
  name: z.string(),
  client_name: z.string().nullable().optional(),
  internal_naming: z.string().nullable().optional(),
  status: CampaignDraftStatusEnum.default('draft'),
  step: z.number().default(1),
  campaign_payload: z.object({
    objective: z.enum(['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_APP_PROMOTION', 'OUTCOME_SALES']).optional(),
    buying_type: z.string().default('AUCTION'),
    special_ad_categories: z.array(z.string()).default([]),
    daily_budget: z.number().optional(),
    lifetime_budget: z.number().optional(),
    cbo_enabled: z.boolean().default(false),
  }).default({}),
  client_review_token: z.string().nullable().optional(),
  published_campaign_id: z.string().nullable().optional(),
  publish_error: z.record(z.any()).nullable().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const TargetingSchema = z.object({
  geo_locations: z.object({
    countries: z.array(z.string()).default([]),
    regions: z.array(z.string()).default([]),
    cities: z.array(z.string()).default([]),
  }).default({}),
  age_min: z.number().default(18),
  age_max: z.number().default(65),
  genders: z.array(z.number()).default([]),
  interests: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
  custom_audiences: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
  excluded_custom_audiences: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
  publisher_platforms: z.array(z.string()).default(['facebook', 'instagram']),
  facebook_positions: z.array(z.string()).optional(),
  instagram_positions: z.array(z.string()).optional(),
});

export const AdSetDraftSchema = z.object({
  id: z.string().uuid().optional(),
  draft_id: z.string().uuid(),
  position: z.number().default(0),
  name: z.string(),
  payload: z.object({
    conversion_location: z.enum(['website', 'app', 'messenger', 'instant_form', 'calls', 'on_ad']),
    optimization_goal: z.string(),
    billing_event: z.string(),
    bid_strategy: z.string().default('LOWEST_COST_WITHOUT_CAP'),
    bid_amount: z.number().optional(),
    daily_budget: z.number().optional(),
    lifetime_budget: z.number().optional(),
    targeting: TargetingSchema,
    start_time: z.string(),
    end_time: z.string().nullable().optional(),
    pixel_id: z.string().nullable().optional(),
    custom_event_type: z.string().nullable().optional(),
    promoted_object: z.record(z.any()).nullable().optional(),
  }),
  published_adset_id: z.string().nullable().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const AdDraftSchema = z.object({
  id: z.string().uuid().optional(),
  adset_id: z.string().uuid(),
  position: z.number().default(0),
  name: z.string(),
  payload: z.object({
    page_id: z.string(),
    instagram_actor_id: z.string().nullable().optional(),
    format: z.enum(['single_image', 'single_video', 'carousel']),
    primary_text: z.string(),
    headline: z.string(),
    description: z.string().nullable().optional(),
    cta_type: z.string(),
    destination_url: z.string(),
    media: z.array(z.object({
      kind: z.enum(['image', 'video']),
      hash: z.string().optional(),
      video_id: z.string().optional(),
      thumbnail_url: z.string().optional(),
      url: z.string().optional()
    })).default([]),
    url_tags: z.string().nullable().optional(),
    tracking_specs: z.array(z.record(z.any())).optional(),
  }),
  published_ad_id: z.string().nullable().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type CampaignDraft = z.infer<typeof CampaignDraftSchema>;
export type AdSetDraft = z.infer<typeof AdSetDraftSchema>;
export type AdDraft = z.infer<typeof AdDraftSchema>;
export type CampaignDraftStatus = z.infer<typeof CampaignDraftStatusEnum>;
export type Targeting = z.infer<typeof TargetingSchema>;

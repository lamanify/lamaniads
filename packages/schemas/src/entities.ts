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

import { Platform, Status } from '@lamani/schemas';

export interface AdsPlatformAdapter {
  listAccounts(): Promise<any[]>;
  listCampaigns(accountId: string): Promise<any[]>;
  getInsights(accountId: string, campaignId: string): Promise<any>;
  pauseCampaign(accountId: string, campaignId: string): Promise<{ success: boolean }>;
}

export function normalizeStatus(platform: Platform, rawStatus: string): Status {
  if (platform === 'meta') {
    switch (rawStatus.toLowerCase()) {
      case 'active':
        return 'active';
      case 'paused':
        return 'paused';
      default:
        return 'error';
    }
  } else {
    switch (rawStatus.toUpperCase()) {
      case 'ENABLED':
        return 'active';
      case 'PAUSED':
        return 'paused';
      default:
        return 'error';
    }
  }
}

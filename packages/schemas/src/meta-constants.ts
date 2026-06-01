export const META_OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Awareness', description: 'Show your ads to people who are most likely to remember them.' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic', description: 'Send people to a destination, like your website, app, or Facebook event.' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement', description: 'Get more video views, post engagement, Page likes or event responses.' },
  { value: 'OUTCOME_LEADS', label: 'Leads', description: 'Collect leads for your business or brand.' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App promotion', description: 'Find new people to install your app and continue using it.' },
  { value: 'OUTCOME_SALES', label: 'Sales', description: 'Find people likely to purchase your product or service.' }
] as const;

export const CTA_TYPES = [
  'LEARN_MORE',
  'SHOP_NOW',
  'SIGN_UP',
  'SUBSCRIBE',
  'BOOK_TRAVEL',
  'CONTACT_US',
  'GET_QUOTE',
  'APPLY_NOW',
  'DOWNLOAD',
  'GET_OFFER',
  'MESSAGE_PAGE',
  'WHATSAPP_MESSAGE'
] as const;

export const SPECIAL_AD_CATEGORIES = [
  { value: 'NONE', label: 'None (No category applies)' },
  { value: 'CREDIT', label: 'Credit (Cards, auto loans, personal financing)' },
  { value: 'EMPLOYMENT', label: 'Employment (Job offers, internships, recruitment)' },
  { value: 'HOUSING', label: 'Housing (Real estate, home insurance, mortgages)' },
  { value: 'ISSUES_ELECTIONS_POLITICS', label: 'Social Issues, Elections or Politics' }
] as const;

export const BILLING_EVENTS = [
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'LINK_CLICKS', label: 'Link clicks' }
] as const;

export const OPTIMIZATION_GOALS_BY_OBJECTIVE: Record<string, string[]> = {
  OUTCOME_AWARENESS: ['IMPRESSIONS', 'REACH', 'AD_RECALL_LIFT'],
  OUTCOME_TRAFFIC: ['LINK_CLICKS', 'LANDING_PAGE_VIEWS'],
  OUTCOME_ENGAGEMENT: ['POST_ENGAGEMENT', 'PAGE_LIKES', 'THRUPLAY'],
  OUTCOME_LEADS: ['LEAD_GENERATION', 'OFFSITE_CONVERSIONS', 'QUALITY_LEAD'],
  OUTCOME_APP_PROMOTION: ['APP_INSTALLS', 'APP_EVENTS'],
  OUTCOME_SALES: ['OFFSITE_CONVERSIONS', 'VALUE']
};

export const CONVERSION_LOCATIONS_BY_OBJECTIVE: Record<string, { value: string; label: string }[]> = {
  OUTCOME_TRAFFIC: [
    { value: 'website', label: 'Website' },
    { value: 'app', label: 'App' },
    { value: 'messenger', label: 'Messenger' }
  ],
  OUTCOME_ENGAGEMENT: [
    { value: 'on_ad', label: 'On your ad (video views, engagement)' },
    { value: 'website', label: 'Website' },
    { value: 'messenger', label: 'Messenger' }
  ],
  OUTCOME_LEADS: [
    { value: 'instant_form', label: 'Instant forms' },
    { value: 'website', label: 'Website' },
    { value: 'messenger', label: 'Messenger' },
    { value: 'calls', label: 'Calls' }
  ],
  OUTCOME_SALES: [
    { value: 'website', label: 'Website' },
    { value: 'app', label: 'App' }
  ]
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-org-id',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

const graphBase = 'https://graph.facebook.com/v19.0';

type MetaParams = Record<string, string | number | undefined>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function graph(path: string, params: MetaParams, method = 'GET', body?: Record<string, unknown>) {
  const url = new URL(`${graphBase}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    method,
    headers: method === 'GET' ? undefined : { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' || !body ? undefined : new URLSearchParams(body as Record<string, string>).toString(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function getMetaToken(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://qxndlpezwqjhlecdxbwe.supabase.co';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const orgId = req.headers.get('x-org-id') || 'a35d1c9d-cf78-44f2-8695-5c032f0ad411';

  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');

  const response = await fetch(
    `${supabaseUrl}/rest/v1/platform_connections?select=access_token_encrypted&org_id=eq.${orgId}&platform=eq.meta&status=eq.active&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) throw new Error(await response.text());

  const data = await response.json();
  const token = data?.[0]?.access_token_encrypted;
  if (!token) throw new Error('No active Meta connection available');

  return token;
}

function normalizeInsights(item: Record<string, any>) {
  let leads = 0;
  let instant_form_leads = 0;
  let website_leads = 0;
  let messenger_leads = 0;
  let cost_per_lead = 0;
  let cost_per_instant_form_lead = 0;
  let cost_per_website_lead = 0;

  for (const action of item.actions || []) {
    const value = Number(action.value || 0);
    if (action.action_type === 'lead') leads = value;
    if (action.action_type === 'onsite_conversion.lead_grouped') instant_form_leads = value;
    if (action.action_type === 'offsite_conversion.fb_pixel_lead') website_leads = value;
    if (action.action_type === 'onsite_conversion.messaging_first_reply') messenger_leads = value;
  }

  for (const action of item.cost_per_action_type || []) {
    const value = Number(action.value || 0);
    if (action.action_type === 'lead') cost_per_lead = value;
    if (action.action_type === 'onsite_conversion.lead_grouped') cost_per_instant_form_lead = value;
    if (action.action_type === 'offsite_conversion.fb_pixel_lead') cost_per_website_lead = value;
  }

  const spend = Number(item.spend || 0);
  const clicks = Number(item.clicks || 0);
  if (!cost_per_lead && leads && spend) cost_per_lead = spend / leads;

  return {
    spend,
    impressions: Number(item.impressions || 0),
    reach: Number(item.reach || 0),
    clicks,
    ctr: Number(item.ctr || 0),
    cpc: Number(item.cpc || 0),
    cpm: Number(item.cpm || 0),
    frequency: Number(item.frequency || 0),
    leads,
    instant_form_leads,
    website_leads,
    messenger_leads,
    conversion_rate: clicks > 0 ? (leads / clicks) * 100 : 0,
    cost_per_lead,
    cost_per_instant_form_lead,
    cost_per_website_lead,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const parts = url.pathname
      .replace('/functions/v1/campaigns', '')
      .replace('/campaigns', '')
      .split('/')
      .filter(Boolean);
    const token = await getMetaToken(req);

    if (req.method === 'GET' && parts.join('/') === 'live/accounts') {
      const nameFilter = url.searchParams.get('name_filter')?.toLowerCase();
      const data = await graph('/me/adaccounts', {
        access_token: token,
        fields: 'name,account_id,account_status,currency,timezone_name',
      });
      const accounts = (data.data || []).map((item: any) => ({
        platform_account_id: item.account_id || String(item.id || '').replace('act_', ''),
        name: item.name || '',
        status: item.account_status === 1 ? 'active' : 'paused',
        currency: item.currency || 'USD',
        timezone: item.timezone_name || '',
      })).filter((item: any) => !nameFilter || item.name.toLowerCase().includes(nameFilter));
      return json(accounts);
    }

    if (req.method === 'GET' && parts[0] === 'live' && parts.length === 1) {
      const accountId = url.searchParams.get('account_id');
      if (!accountId) return json({ error: 'account_id required' }, 400);
      const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
      const data = await graph(`/${actId}/campaigns`, {
        access_token: token,
        fields: 'id,name,status,objective,budget_remaining,daily_budget,lifetime_budget,buying_type,start_time,stop_time,created_time,updated_time',
      });
      return json((data.data || []).map((item: any) => ({
        platform: 'meta',
        platform_campaign_id: item.id,
        name: item.name,
        status: item.status === 'ACTIVE' ? 'active' : 'paused',
        budget_amount: Number(item.daily_budget || item.lifetime_budget || 0),
        currency: 'USD',
        native_payload_json: item,
        normalized_payload_json: {
          objective: item.objective,
          buying_type: item.buying_type,
          start_time: item.start_time,
          stop_time: item.stop_time,
        },
      })));
    }

    if (req.method === 'GET' && parts[0] === 'live' && parts[1] === 'accounts' && parts[3] === 'campaign-insights') {
      const accountId = parts[2];
      const actId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
      const data = await graph(`/${actId}/insights`, {
        access_token: token,
        level: 'campaign',
        fields: 'campaign_id,impressions,clicks,spend,actions,cost_per_action_type,ctr,cpc,cpm,reach,frequency',
        date_preset: url.searchParams.get('date_preset') || 'last_30d',
        limit: 500,
      });
      const map: Record<string, unknown> = {};
      for (const item of data.data || []) {
        if (item.campaign_id) map[item.campaign_id] = normalizeInsights(item);
      }
      return json(map);
    }

    if (req.method === 'GET' && parts[0] === 'live' && parts[2] === 'insights') {
      const data = await graph(`/${parts[1]}/insights`, {
        access_token: token,
        fields: 'impressions,clicks,spend,actions,cost_per_action_type,ctr,cpc,cpm,reach,frequency',
        date_preset: url.searchParams.get('date_preset') || 'last_30d',
      });
      return json((data.data || [])[0] ? normalizeInsights(data.data[0]) : normalizeInsights({}));
    }

    if (req.method === 'GET' && parts[0] === 'live' && parts[2] === 'adsets') {
      const data = await graph(`/${parts[1]}/adsets`, {
        access_token: token,
        fields: 'id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time',
      });
      return json(data.data || []);
    }

    if (req.method === 'GET' && parts[0] === 'live' && parts[1] === 'adsets' && parts[3] === 'ads') {
      const data = await graph(`/${parts[2]}/ads`, {
        access_token: token,
        fields: 'id,name,status,creative,effective_status',
      });
      return json(data.data || []);
    }

    if (req.method === 'POST' && parts[0] === 'live' && parts[2] === 'status') {
      const body = await req.json();
      const status = String(body.status || '').toLowerCase() === 'active' ? 'ACTIVE' : 'PAUSED';
      const data = await graph(`/${parts[1]}`, { access_token: token }, 'POST', { status });
      return json({ success: true, data });
    }

    if (req.method === 'POST' && parts[0] === 'live' && parts[2] === 'budget') {
      const body = await req.json();
      const payload: Record<string, unknown> = {};
      if (body.daily_budget !== undefined) payload.daily_budget = body.daily_budget;
      if (body.lifetime_budget !== undefined) payload.lifetime_budget = body.lifetime_budget;
      const data = await graph(`/${parts[1]}`, { access_token: token }, 'POST', payload);
      return json({ success: true, data });
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

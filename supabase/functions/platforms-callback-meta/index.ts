import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return new Response('Missing code or state', { status: 400 });
    }

    const metaAppId = Deno.env.get('META_APP_ID');
    const metaClientSecret = Deno.env.get('META_CLIENT_SECRET');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://qxndlpezwqjhlecdxbwe.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!metaAppId || !metaClientSecret) {
      return new Response('Meta credentials not configured', { status: 500 });
    }

    const tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
    const tokenParams = new URLSearchParams({
      client_id: metaAppId,
      client_secret: metaClientSecret,
      redirect_uri: `${supabaseUrl}/functions/v1/platforms-callback-meta`,
      code: code,
    });

    const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Meta token exchange failed:', errorData);
      return new Response('Failed to exchange Meta code', { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const meResponse = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`
    );
    let accountName: string | null = null;
    let accountEmail: string | null = null;
    if (meResponse.ok) {
      const meData = await meResponse.json();
      accountName = meData.name || null;
      accountEmail = meData.email || null;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('platform_connections')
      .insert({
        org_id: state,
        platform: 'meta',
        access_token_encrypted: accessToken,
        status: 'active',
        account_name: accountName,
        account_email: accountEmail,
      });

    if (error) {
      console.error('Database insert error:', error);
      return new Response('Failed to store connection', { status: 500 });
    }

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appUrl}/accounts?connected=meta`,
      },
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

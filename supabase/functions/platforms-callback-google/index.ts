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

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://qxndlpezwqjhlecdxbwe.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!googleClientId || !googleClientSecret) {
      return new Response('Google credentials not configured', { status: 500 });
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenBody = new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: `${supabaseUrl}/functions/v1/platforms-callback-google`,
      grant_type: 'authorization_code',
      code: code,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Google token exchange failed:', errorData);
      return new Response('Failed to exchange Google code', { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    const userinfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    let accountName: string | null = null;
    let accountEmail: string | null = null;
    if (userinfoResponse.ok) {
      const userinfo = await userinfoResponse.json();
      accountName = userinfo.name || null;
      accountEmail = userinfo.email || null;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('platform_connections')
      .insert({
        org_id: state,
        platform: 'google',
        access_token_encrypted: accessToken,
        refresh_token_encrypted: refreshToken || null,
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
        'Location': `${appUrl}/accounts?connected=google`,
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

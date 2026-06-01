import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-org-id',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get('platform');
    const orgId = req.headers.get('x-org-id');

    if (!platform || !orgId) {
      return new Response(
        JSON.stringify({ error: 'Missing platform or org_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://qxndlpezwqjhlecdxbwe.supabase.co';

    if (platform === 'meta') {
      const metaAppId = Deno.env.get('META_APP_ID');
      if (!metaAppId) {
        return new Response(
          JSON.stringify({ error: 'META_APP_ID not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = `${supabaseUrl}/functions/v1/platforms-callback-meta`;
      const params = new URLSearchParams({
        client_id: metaAppId,
        redirect_uri: redirectUri,
        scope: 'ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,pages_manage_metadata,instagram_basic',
        response_type: 'code',
        state: orgId,
      });

      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
      
      return new Response(
        JSON.stringify({ url: oauthUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (platform === 'google') {
      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      if (!googleClientId) {
        return new Response(
          JSON.stringify({ error: 'GOOGLE_CLIENT_ID not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = `${supabaseUrl}/functions/v1/platforms-callback-google`;
      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        scope: 'https://www.googleapis.com/auth/adwords',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        state: orgId,
      });

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      
      return new Response(
        JSON.stringify({ url: oauthUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid platform' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

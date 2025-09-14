export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Edge Function: get-orders
// Returns all rows from public.orders via Supabase REST using the SERVICE_ROLE key.
Deno.serve(async (req)=>{
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Build REST URL for the orders table
    const url = new URL('/rest/v1/orders', SUPABASE_URL);
    // Select all columns; you can customize or add ?order=created_at.desc
    url.searchParams.set('select', '*');
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json'
      }
    });
    const text = await res.text();
    // If Supabase returned an error object (e.g., 4xx/5xx), forward it
    if (!res.ok) {
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (e) {
        payload = {
          error: text
        };
      }
      return new Response(JSON.stringify({
        status: res.status,
        error: payload
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type'
        }
      });
    }
    // Parse successful response
    const data = JSON.parse(text || '[]');
    return new Response(JSON.stringify({
      data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

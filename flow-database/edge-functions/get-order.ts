import { createClient } from "npm:@supabase/supabase-js@2.33.0";
console.info('get-order function starting');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});
function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
}
Deno.serve(async (req)=>{
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }
  try {
    const url = new URL(req.url);
    // Accept either query param ?id=... or path /get-order/:id
    let orderId = url.searchParams.get('id');
    if (!orderId) {
      // parse path segments
      const segments = url.pathname.split('/').filter(Boolean);
      // expect last segment to be the id when calling /get-order/:id
      if (segments.length >= 2 && segments[segments.length - 2] === 'get-order') {
        orderId = segments[segments.length - 1];
      }
    }
    if (!orderId) {
      return new Response(JSON.stringify({
        error: 'Missing order id (use ?id= or /get-order/:id)'
      }), {
        status: 400,
        headers: corsHeaders()
      });
    }
    // Validate UUID-like or numeric id depending on your schema. We'll query generically.
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).limit(1).maybeSingle();
    if (error) {
      console.error('Supabase query error', error);
      return new Response(JSON.stringify({
        error: 'Database query failed'
      }), {
        status: 500,
        headers: corsHeaders()
      });
    }
    if (!data) {
      return new Response(JSON.stringify({
        error: 'Order not found'
      }), {
        status: 404,
        headers: corsHeaders()
      });
    }
    return new Response(JSON.stringify({
      order: data
    }), {
      status: 200,
      headers: corsHeaders()
    });
  } catch (err) {
    console.error('Unhandled error', err);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: corsHeaders()
    });
  }
});

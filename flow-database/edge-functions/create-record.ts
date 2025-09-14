import { createClient } from "npm:@supabase/supabase-js@2.37.0";
console.info('create-record function initialized');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});
async function handleCreate(body) {
  // Basic validation
  const { patient_id, order_id, content } = body || {};
  if (!patient_id || !order_id || typeof content !== 'string') {
    return {
      status: 400,
      body: {
        error: 'Missing or invalid fields. Required: patient_id (uuid or text), order_id (uuid or text), content (string).'
      }
    };
  }
  // Insert into public.records
  const { data, error } = await supabase.from('records').insert([
    {
      patient_id: patient_id,
      order_id: order_id,
      content: content
    }
  ]).select().limit(1);
  if (error) {
    console.error('Insert error', error);
    return {
      status: 500,
      body: {
        error: error.message
      }
    };
  }
  return {
    status: 201,
    body: {
      data: data?.[0] ?? null
    }
  };
}
Deno.serve(async (req)=>{
  try {
    const url = new URL(req.url);
    // Only allow POST to /create-record
    if (req.method !== 'POST' && !(req.method === 'OPTIONS')) {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }
    const contentType = req.headers.get('content-type') || '';
    let body = {};
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      // support form data
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    }
    const result = await handleCreate(body);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    });
  } catch (err) {
    console.error('Unhandled error', err);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    });
  }
});
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

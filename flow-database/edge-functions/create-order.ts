import { createClient } from "npm:@supabase/supabase-js@2.34.0";
console.info('create-order function initialized');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type',
  'Access-Control-Max-Age': '86400'
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});
Deno.serve(async (req)=>{
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed, use POST'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({
        error: 'Content-Type must be application/json'
      }), {
        status: 415,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    const body = await req.json();
    // Validate inputs
    const patient_id = body?.patient_id;
    const test = body?.test;
    if (!patient_id) {
      return new Response(JSON.stringify({
        error: 'Missing required field: patient_id'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    if (!test) {
      return new Response(JSON.stringify({
        error: 'Missing required field: test'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Insert into the "orders" table. Because the table name is a SQL reserved word, we rely on the client to handle proper quoting.
    const { data, error } = await supabase.from('orders').insert([
      {
        patient_id,
        test
      }
    ]).select().single();
    if (error) {
      console.error('Insert error', error);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Return created row
    return new Response(JSON.stringify({
      data
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error('Unhandled error', err);
    return new Response(JSON.stringify({
      error: 'Internal Server Error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2.34.0";
// Edge function to insert a record into public.records
// Expects JSON body: { patient_id: string, order_id: string, content: string }
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
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type',
  'Access-Control-Max-Age': '86400'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({
        error: 'Expected application/json'
      }), {
        status: 415,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    const body = await req.json();
    const { patient_id, order_id, content } = body || {};
    if (!patient_id || !order_id || content === undefined) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: patient_id, order_id, content'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Insert into public.records using service role key (bypasses RLS)
    const { data, error } = await supabase.from('records').insert([
      {
        patient_id: patient_id,
        order_id: order_id,
        content: content
      }
    ]).select().limit(1);
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
    // Update the orders table to set status to true
    const { data: updatedOrder, error: updateError } = await supabase.from('orders').update({
      status: true
    }).eq('id', order_id).select().limit(1).maybeSingle();
    if (updateError) {
      console.error('Update order status error', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to update order status',
        details: updateError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    return new Response(JSON.stringify({
      data,
      updated_order: updatedOrder
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error('Unexpected error', err);
    return new Response(JSON.stringify({
      error: 'Unexpected server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});

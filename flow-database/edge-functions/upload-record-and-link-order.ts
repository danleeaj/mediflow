import { createClient } from "npm:@supabase/supabase-js@2.35.0";
// Using prepopulated env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');
Deno.serve(async (req)=>{
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Only POST allowed'
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
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const body = await req.json();
    // Basic validation
    const order_id_raw = body.order_id;
    const data = body.data;
    if (order_id_raw === undefined || data === undefined) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: order_id and data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const order_id = Number(order_id_raw);
    if (!Number.isInteger(order_id)) {
      return new Response(JSON.stringify({
        error: 'order_id must be an integer'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Serialize data to JSON
    const jsonString = JSON.stringify(data);
    const timestamp = Date.now();
    const filename = `order_${order_id}_${timestamp}.json`;
    const bucket = 'records';
    const path = filename;
    // Upload to storage (as text/json)
    const uploadRes = await supabase.storage.from(bucket).upload(path, new Blob([
      jsonString
    ], {
      type: 'application/json'
    }), {
      contentType: 'application/json',
      cacheControl: '3600',
      upsert: false
    });
    if (uploadRes.error) {
      console.error('Upload error', uploadRes.error);
      return new Response(JSON.stringify({
        error: 'Failed to upload file to storage',
        details: uploadRes.error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Create a temporary signed URL (e.g., 1 hour)
    const expiresInSeconds = 60 * 60; // 1 hour
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error', signedUrlError);
      return new Response(JSON.stringify({
        error: 'Failed to create signed URL',
        details: signedUrlError?.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const tempUrl = signedUrlData.signedUrl;
    // Query orders table for the order to get patient_id
    const { data: orders, error: ordersError } = await supabase.from('orders').select('id, patient_id').eq('id', order_id).limit(1).maybeSingle();
    if (ordersError) {
      console.error('Orders query error', ordersError);
      return new Response(JSON.stringify({
        error: 'Failed to query orders table',
        details: ordersError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (!orders) {
      return new Response(JSON.stringify({
        error: 'Order not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const patient_id = orders.patient_id;
    // Insert into records table
    const insertPayload = {
      url: tempUrl,
      order_id: orders.id,
      patient_id: patient_id
    };
    const { data: inserted, error: insertError } = await supabase.from('records').insert(insertPayload).select().limit(1).maybeSingle();
    if (insertError) {
      console.error('Insert error', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to insert into records table',
        details: insertError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Update the orders table to set status to "True"
    const { data: updatedOrder, error: updateError } = await supabase.from('orders').update({
      status: 'True'
    }).eq('id', order_id).select().limit(1).maybeSingle();
    if (updateError) {
      console.error('Update order status error', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to update order status',
        details: updateError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      record: inserted,
      temp_url: tempUrl,
      updated_order: updatedOrder
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Unexpected error', err);
    return new Response(JSON.stringify({
      error: 'Unexpected error',
      details: String(err)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

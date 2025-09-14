import { createClient } from "npm:@supabase/supabase-js@2.26.0";
// This Edge Function expects a JSON body: { "patient_id": "<uuid-or-text>" }
// It uses the SERVICE_ROLE key (SUPABASE_SERVICE_ROLE_KEY) to query the database securely.
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});
console.info('get-records-by-patient function started');
Deno.serve(async (req)=>{
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Only POST allowed. Send JSON { "patient_id": "..." }'
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
    const patient_id = body?.patient_id;
    if (!patient_id) {
      return new Response(JSON.stringify({
        error: 'Missing required field: patient_id'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Query the records table for matching patient_id
    const { data, error } = await sb.from('records').select('*').eq('patient_id', patient_id);
    if (error) {
      console.error('Supabase query error', error);
      return new Response(JSON.stringify({
        error: 'Database query failed',
        details: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Fetch content from URLs
    try {
      const recordsWithContent = await Promise.all(data.map(async (record)=>{
        try {
          const response = await fetch(record.url);
          if (!response.ok) {
            console.error(`Failed to fetch URL ${record.url}: ${response.status} ${response.statusText}`);
            return {
              ...record,
              content: null,
              content_error: `Failed to fetch: ${response.status} ${response.statusText}`
            };
          }
          const content = await response.text();
          return {
            ...record,
            content: content,
            url: record.url // Keep original URL for reference if needed
          };
        } catch (fetchError) {
          console.error(`Error fetching URL ${record.url}:`, fetchError);
          return {
            ...record,
            content: null,
            content_error: `Fetch error: ${fetchError.message}`
          };
        }
      }));
      return new Response(JSON.stringify({
        data: recordsWithContent
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (contentFetchError) {
      console.error('Error fetching content from URLs:', contentFetchError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch content from URLs',
        details: contentFetchError.message,
        original_data: data // Return original data as fallback
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (err) {
    console.error('Unhandled error', err);
    return new Response(JSON.stringify({
      error: 'Unhandled error',
      details: String(err)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

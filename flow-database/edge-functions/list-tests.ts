import { createClient } from "npm:@supabase/supabase-js@2.36.0";
// Ensure these environment variables are available in Supabase Edge runtime
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '', {
  auth: {
    persistSession: false
  }
});
console.info('Edge function `list-tests` starting');
Deno.serve(async (req)=>{
  try {
    // Query the `tests` table for name and description
    const { data, error } = await supabase.from('tests').select('name, description').order('id', {
      ascending: true
    });
    if (error) {
      console.error('Database error:', error.message);
      return new Response(JSON.stringify({
        error: 'Failed to fetch tests'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      tests: data ?? []
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive'
      }
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

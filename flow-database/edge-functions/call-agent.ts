// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
console.info('server started');
Deno.serve(async (req)=>{
  try {
    const { patientId } = await req.json();
    // Validate that patientId is provided
    if (!patientId) {
      return new Response(JSON.stringify({
        error: 'Patient ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Make POST request to the external API
    const apiUrl = `https://render-fastapi-flow.onrender.com/patient/${patientId}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    // Handle the response from the external API
    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'External API request failed',
        status: response.status,
        statusText: response.statusText
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const responseData = await response.json();
    return new Response(JSON.stringify({
      message: 'API call successful',
      data: responseData
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

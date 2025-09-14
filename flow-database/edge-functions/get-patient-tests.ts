console.info('Edge function: get-patient-tests');
Deno.serve(async (req)=>{
  try {
    const contentType = req.headers.get('content-type') || '';
    let body = {};
    if (req.method === 'GET') {
      const url = new URL(req.url);
      body.patient_id = url.searchParams.get('patient_id');
    } else {
      if (contentType.includes('application/json')) body = await req.json();
      else {
        return new Response(JSON.stringify({
          error: 'Expected JSON body'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }
    const { patient_id } = body;
    if (!patient_id) return new Response(JSON.stringify({
      error: 'patient_id is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // 1) Fetch matching records (order_id and content)
    const recordsUrl = `${SUPABASE_URL}/rest/v1/records?patient_id=eq.${encodeURIComponent(patient_id)}&select=id,order_id,content`;
    const recordsRes = await fetch(recordsUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json'
      }
    });
    if (!recordsRes.ok) {
      const text = await recordsRes.text();
      return new Response(JSON.stringify({
        error: 'Error fetching records',
        detail: text
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const records = await recordsRes.json();
    // If no records, return empty
    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({
        data: []
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Collect unique order_ids
    const orderIds = Array.from(new Set(records.map((r)=>r.order_id).filter(Boolean)));
    // 2) Fetch orders for those ids
    let orders = [];
    if (orderIds.length > 0) {
      // Build in-list. For text/uuid values wrap in quotes; we'll URL-encode a comma-separated list using in.(...)
      // Supabase REST expects id=in.(id1,id2)
      const encodedList = orderIds.map((id)=>encodeURIComponent(id)).join(',');
      const ordersUrl = `${SUPABASE_URL}/rest/v1/orders?id=in.(${encodedList})&select=id,test`;
      const ordersRes = await fetch(ordersUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Accept: 'application/json'
        }
      });
      if (!ordersRes.ok) {
        const text = await ordersRes.text();
        return new Response(JSON.stringify({
          error: 'Error fetching orders',
          detail: text
        }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      orders = await ordersRes.json();
    }
    // Map orders by id for quick lookup
    const ordersById = new Map(orders.map((o)=>[
        String(o.id),
        o
      ]));
    // Build result: for each record, find matching order.test
    const result = records.map((r)=>{
      const order = ordersById.get(String(r.order_id)) || null;
      return {
        record_id: r.id,
        order_id: r.order_id,
        content: r.content,
        test: order ? order.test : null
      };
    });
    return new Response(JSON.stringify({
      data: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error(err);
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

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    try {
      const { prompt } = await request.json();
      if (!prompt) return new Response(
        JSON.stringify({ error: 'prompt required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

      // HF Serverless Inference router endpoint (bypasses api-inference subdomain)
      const hfRes = await fetch(
        'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      if (!hfRes.ok) {
        const err = await hfRes.text();
        return new Response(
          JSON.stringify({ error: `HF error: ${err}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const imgBuffer = await hfRes.arrayBuffer();
      const contentType = hfRes.headers.get('content-type') ?? 'image/jpeg';

      return new Response(imgBuffer, {
        headers: { ...corsHeaders, 'Content-Type': contentType },
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};

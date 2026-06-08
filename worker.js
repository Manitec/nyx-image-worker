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

      // POST to Replicate — FLUX.1 schnell
      const startRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify({
          model: 'black-forest-labs/flux-schnell',
          input: {
            prompt: prompt,
            num_outputs: 1,
            output_format: 'png',
            output_quality: 90,
            disable_safety_checker: true,
          },
        }),
      });

      if (!startRes.ok) {
        const err = await startRes.text();
        return new Response(
          JSON.stringify({ error: `Replicate error: ${err}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const prediction = await startRes.json();
      let outputUrl = prediction?.output?.[0];

      // Poll if Prefer:wait didn't resolve synchronously
      if (!outputUrl && prediction?.urls?.get) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const poll = await fetch(prediction.urls.get, {
            headers: { 'Authorization': `Bearer ${env.REPLICATE_API_TOKEN}` },
          });
          const result = await poll.json();
          if (result.status === 'succeeded') { outputUrl = result.output?.[0]; break; }
          if (result.status === 'failed') throw new Error(result.error || 'Generation failed');
        }
      }

      if (!outputUrl) throw new Error('Timed out waiting for image');

      // Fetch and return image binary — same contract as original CF Worker
      const imgRes = await fetch(outputUrl);
      const imgBuffer = await imgRes.arrayBuffer();

      return new Response(imgBuffer, {
        headers: { ...corsHeaders, 'Content-Type': 'image/png' },
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};

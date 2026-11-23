// Cloudflare Pages Function: GET /api/giveaways
// GamerPower is the live no-key source. IsThereAnyDeal is intentionally not
// enabled here: obtain written permission for this public giveaway-index use
// before adding its API key, as its published terms restrict competing uses.
export async function onRequestGet({ request, env }) {
  const upstream = "https://www.gamerpower.com/api/giveaways";
  try {
    const response = await fetch(upstream, {
      headers: { "Accept": "application/json", "User-Agent": "LiberumLudos/1.0 (community giveaway index)" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!response.ok) {
      return Response.json({ error: "Giveaway provider unavailable", status: response.status }, {
        status: 502, headers: corsHeaders()
      });
    }
    const body = await response.json();
    return Response.json(body, {
      headers: { ...corsHeaders(), "Cache-Control": "public, max-age=180, s-maxage=300" }
    });
  } catch (error) {
    return Response.json({ error: "Could not reach giveaway provider" }, {
      status: 502, headers: corsHeaders()
    });
  }
}
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff"
  };
}
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

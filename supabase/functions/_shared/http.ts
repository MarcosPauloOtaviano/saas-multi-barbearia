export function corsHeaders(request: Request) {
  const allowedOrigin = Deno.env.get("APP_URL") ?? "";
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

export function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

export function serviceClientConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  // Hosted Edge Functions now expose privileged keys through the reserved
  // SUPABASE_SECRET_KEYS JSON variable. Keep the legacy variable as a local
  // development fallback so the same function bundle works in both runtimes.
  let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (secretKeys) {
      try {
        const parsed = JSON.parse(secretKeys) as Record<string, unknown>;
        if (typeof parsed.default === "string") serviceKey = parsed.default;
      } catch {
        // Treat malformed injected secrets as missing configuration.
      }
    }
  }
  if (!url || !serviceKey) throw new Error("Supabase service configuration is missing");
  return { url, serviceKey };
}

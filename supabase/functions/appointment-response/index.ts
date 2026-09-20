import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { corsHeaders, json, serviceClientConfig } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);
  try {
    const { token, action } = await request.json();
    if (typeof token !== "string" || token.length < 40 || !["confirm", "cancel"].includes(action)) return json(request, { error: "invalid_payload" }, 400);
    const { url, serviceKey } = serviceClientConfig();
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("respond_to_appointment", { raw_token: token, response_action: action });
    if (error) return json(request, { error: "invalid_or_expired_token" }, 410);
    return json(request, { appointmentId: data, status: action === "confirm" ? "confirmed" : "cancelled" });
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "unexpected_error" }, 500);
  }
});

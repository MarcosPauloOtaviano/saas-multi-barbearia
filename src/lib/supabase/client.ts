import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

export function createClient() {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error("Supabase não configurado");
  // Keep one browser client for the entire session. Recreating it for every
  // action can leave a suspended mobile tab with different auth listeners and
  // a stale access token when it becomes visible again.
  browserClient ??= createBrowserClient(supabaseUrl, supabasePublishableKey);
  return browserClient;
}

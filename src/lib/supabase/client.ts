import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export function createClient() {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error("Supabase não configurado");
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

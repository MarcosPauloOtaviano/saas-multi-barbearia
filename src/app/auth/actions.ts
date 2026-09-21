"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export type AuthState = { error?: string; success?: string };

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) return { error: "O ambiente de produção ainda não está conectado ao banco." };
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)) return { error: "Estabelecimento inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha inválidos." };
  const { data: membership } = await supabase
    .from("memberships")
    .select("id,barbershops!inner(slug)")
    .eq("user_id", data.user.id)
    .eq("status", "active")
    .eq("barbershops.slug", tenantSlug)
    .maybeSingle();
  if (!membership) {
    await supabase.auth.signOut();
    return { error: "Acesso não autorizado para este estabelecimento." };
  }
  redirect(`/admin/${tenantSlug}`);
}

export async function sendReset(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) return { error: "O ambiente de produção ainda não está conectado ao banco." };
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)) return { error: "Estabelecimento inválido." };
  const supabase = await createClient();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl}/auth/callback?type=recovery&next=/admin/${tenantSlug}/entrar` });
  if (error) return { error: "Não foi possível enviar o e-mail agora." };
  return { success: "Se o endereço estiver cadastrado, você receberá as instruções." };
}

export async function signOut(tenantSlug = "stilo-sampa") {
  if (hasSupabaseEnv) { const supabase = await createClient(); await supabase.auth.signOut(); }
  const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug) ? tenantSlug : "stilo-sampa";
  redirect(`/admin/${safeSlug}/entrar`);
}

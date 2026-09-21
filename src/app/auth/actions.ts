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
  if (tenantSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)) return { error: "Estabelecimento inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha inválidos." };
  const membershipQuery = supabase
    .from("memberships")
    .select("id,barbershop_id,barbershops!inner(slug)")
    .eq("user_id", data.user.id)
    .eq("status", "active");
  const { data: memberships } = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug)
    ? await membershipQuery.eq("barbershops.slug", tenantSlug)
    : await membershipQuery;
  if (!memberships?.length) {
    await supabase.auth.signOut();
    return { error: tenantSlug ? "Acesso não autorizado para este estabelecimento." : "Seu usuário ainda não está ligado a um estabelecimento ativo." };
  }
  const { data: profile } = await supabase.from("profiles").select("must_change_password").eq("id", data.user.id).maybeSingle();
  const firstMembership = memberships[0];
  const firstShop = Array.isArray(firstMembership.barbershops) ? firstMembership.barbershops[0] : firstMembership.barbershops;
  if (profile?.must_change_password) redirect(`/auth/redefinir-senha?next=${memberships.length === 1 ? `/admin/${firstShop.slug}` : "/admin/escolher-estabelecimento"}`);
  if (memberships.length > 1 && !tenantSlug) redirect("/admin/escolher-estabelecimento");
  redirect(`/admin/${firstShop.slug}`);
}

export async function sendReset(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) return { error: "O ambiente de produção ainda não está conectado ao banco." };
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const safeNext = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug) ? `/admin/${tenantSlug}/entrar` : "/admin";
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl}/auth/callback?type=recovery&next=${encodeURIComponent(safeNext)}` });
  if (error) return { error: "Não foi possível enviar o e-mail agora." };
  return { success: "Se o endereço estiver cadastrado, você receberá as instruções." };
}

export async function signOut(tenantSlug?: string) {
  if (hasSupabaseEnv) { const supabase = await createClient(); await supabase.auth.signOut(); }
  const safeSlug = tenantSlug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenantSlug) ? tenantSlug : null;
  redirect(safeSlug ? `/admin/${safeSlug}/entrar` : "/admin");
}

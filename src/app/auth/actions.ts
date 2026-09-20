"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export type AuthState = { error?: string; success?: string };

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) { redirect("/admin"); }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha inválidos." };
  redirect("/admin");
}

export async function sendReset(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) return { success: "Modo demonstração: nenhum e-mail foi enviado." };
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: "Não foi possível enviar o e-mail agora." };
  return { success: "Se o endereço estiver cadastrado, você receberá as instruções." };
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) redirect("/onboarding");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (fullName.length < 2 || password.length < 8) return { error: "Informe seu nome e uma senha com pelo menos 8 caracteres." };
  const supabase = await createClient();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding` } });
  if (error) return { error: "Não foi possível criar a conta. Verifique os dados informados." };
  if (data.session) redirect("/onboarding");
  return { success: "Confira seu e-mail para confirmar a conta e continuar." };
}

export async function signOut() {
  if (hasSupabaseEnv) { const supabase = await createClient(); await supabase.auth.signOut(); }
  redirect("/login");
}

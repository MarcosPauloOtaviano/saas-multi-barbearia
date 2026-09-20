"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export type OnboardingState = { error?: string };

export async function createBarbershop(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  if (!hasSupabaseEnv) redirect("/");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  if (name.length < 2 || ownerName.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: "Revise o nome e o endereço público." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_barbershop", { shop_name: name, shop_slug: slug, owner_name: ownerName, shop_timezone: "America/Sao_Paulo" });
  if (error?.code === "23505") return { error: "Esse endereço público já está em uso." };
  if (error) return { error: "Não foi possível criar a barbearia agora." };
  redirect("/");
}

import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export default async function TenantDashboardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!hasSupabaseEnv) redirect(`/admin/${slug}/entrar`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/admin/${slug}/entrar`);
  const { data: membership } = await supabase
    .from("memberships")
    .select("id,barbershops!inner(slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("barbershops.slug", slug)
    .maybeSingle();
  if (!membership) redirect(`/admin/${slug}/entrar?erro=acesso`);
  const { data: profile } = await supabase.from("profiles").select("must_change_password").eq("id", user.id).maybeSingle();
  if (profile?.must_change_password) redirect(`/auth/redefinir-senha?next=/admin/${slug}`);
  return <AppShell slug={slug}>{children}</AppShell>;
}

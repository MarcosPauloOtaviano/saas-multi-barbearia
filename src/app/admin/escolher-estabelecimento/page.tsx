import Link from "next/link";
import { redirect } from "next/navigation";
import { Scissors, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ChooseEstablishmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  const { data: memberships } = await supabase.from("memberships").select("id,role,barbershops!inner(name,slug)").eq("user_id", user.id).eq("status", "active");
  if (!memberships?.length) redirect("/admin");
  if (memberships.length === 1) {
    const shop = Array.isArray(memberships[0].barbershops) ? memberships[0].barbershops[0] : memberships[0].barbershops;
    redirect(`/admin/${shop.slug}`);
  }
  return <main className="tenant-choice-page"><section className="tenant-choice-card"><div className="tenant-choice-brand"><span><Scissors /></span><strong>BarberFlow</strong></div><p className="eyebrow">Acesso da equipe</p><h1>Escolha o estabelecimento</h1><p>Seu usuário tem acesso a mais de uma operação. Entre no painel correto para não misturar agendas ou clientes.</p><div className="tenant-choice-list">{memberships.map((membership) => { const shop = Array.isArray(membership.barbershops) ? membership.barbershops[0] : membership.barbershops; return <Link className="tenant-choice-item" href={`/admin/${shop.slug}`} key={membership.id}><span><Store /></span><div><strong>{shop.name}</strong><small>{membership.role === "owner" ? "Proprietário" : membership.role === "manager" ? "Gerente" : "Equipe"}</small></div><b>Entrar</b></Link>; })}</div><Link className="tenant-choice-back" href="/admin">Voltar para o login</Link></section></main>;
}

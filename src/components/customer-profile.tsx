"use client";

import Link from "next/link";
import { Bell, ChevronRight, FileText, Heart, LogOut, Mail, Phone, ShieldCheck } from "lucide-react";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export function CustomerProfile() {
  if (hasSupabaseEnv) return <section className="customer-page"><div className="customer-page-title"><p className="eyebrow">Privacidade</p><h1>Seu acesso é sem senha.</h1><p>Os links enviados ao seu e-mail permitem administrar somente o agendamento correspondente.</p></div><div className="customer-access-card"><span><ShieldCheck /></span><h2>Dados protegidos</h2><p>A barbearia usa seus dados apenas para administrar horários e lembretes solicitados por você.</p><Link className="button primary" href="/b/stilo-sampa">Agendar horário</Link></div><Link className="customer-admin-link" href="/login"><LogOut /> Entrar na área da equipe</Link></section>;
  return <section className="customer-page"><div className="customer-profile-hero"><span>RN</span><div><p className="eyebrow">Seu perfil</p><h1>Rafael Nunes</h1><p>Cliente desde 2024 · 14 visitas</p></div></div>
    <div className="customer-profile-card"><h2>Contato</h2><label><span><Mail /></span><div><small>E-mail</small><strong>rafael@exemplo.com</strong></div><ChevronRight /></label><label><span><Phone /></span><div><small>Telefone</small><strong>(31) 99924-1608</strong></div><ChevronRight /></label></div>
    <div className="customer-profile-card"><h2>Preferências</h2><Link href="/cliente/servicos"><span><Heart /></span><div><strong>Serviços favoritos</strong><small>Corte + barba e corte clássico</small></div><ChevronRight /></Link><button><span><Bell /></span><div><strong>Lembretes</strong><small>E-mail · 24h e 2h antes</small></div><i className="profile-toggle" /></button></div>
    <div className="customer-profile-card"><h2>Privacidade</h2><button><span><ShieldCheck /></span><div><strong>Seus dados</strong><small>Correção, exportação e exclusão</small></div><ChevronRight /></button><button><span><FileText /></span><div><strong>Termos e política</strong><small>Como usamos suas informações</small></div><ChevronRight /></button></div>
    <Link className="customer-admin-link" href="/login"><LogOut /> Entrar na área da barbearia</Link>
  </section>;
}

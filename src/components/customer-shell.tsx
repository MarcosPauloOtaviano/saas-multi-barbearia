"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Scissors, ShieldCheck, Sparkles, UserRound } from "lucide-react";

type CustomerShellProps = {
  children: React.ReactNode;
  tenant?: { slug: string; name: string } | null;
  showNavigation?: boolean;
};

export function CustomerShell({ children, tenant = null, showNavigation = Boolean(tenant) }: CustomerShellProps) {
  const pathname = usePathname();
  const slug = tenant?.slug;
  const homeHref = slug ? `/b/${slug}` : "/";
  const accountHref = "/conta";
  const brandName = tenant?.name ?? "BarberFlow";
  const brandCaption = tenant ? "Agendamento oficial" : "Agenda para barbearias";
  const isHome = Boolean(slug && pathname === homeHref);
  return <main className="customer-app">
    <header className={`customer-header${isHome ? " customer-header--home" : ""}`}>
      <Link className="customer-brand" href={homeHref}><span><Scissors /></span><div><strong>{brandName}</strong><small>{brandCaption}</small></div></Link>
      <Link className="customer-avatar" href={accountHref} aria-label="Minha conta"><UserRound size={18} /></Link>
    </header>
    <div className="customer-content">{children}</div>
    {showNavigation && slug && <nav className="customer-nav" aria-label="Navegação do cliente">
      <Link className={pathname === homeHref ? "is-active" : ""} href={homeHref}><House /><span>Início</span></Link>
      <Link className={pathname.startsWith(`/b/${slug}/servicos`) ? "is-active" : ""} href={`/b/${slug}/servicos`}><Sparkles /><span>Serviços</span></Link>
      <Link className="customer-book" href={`/b/${slug}/agendar`} aria-label="Agendar horário"><span><Scissors /></span><small>Agendar</small></Link>
      <Link className={pathname === accountHref ? "is-active" : ""} href={accountHref}><CalendarDays /><span>Horários</span></Link>
      <Link className={pathname.startsWith("/conta") ? "is-active" : ""} href={accountHref}><ShieldCheck /><span>Conta</span></Link>
    </nav>}
  </main>;
}

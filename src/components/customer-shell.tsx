"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, MapPin, Scissors, Sparkles, UserRound } from "lucide-react";

const navigation = [
  { href: "/", label: "Início", icon: House },
  { href: "/cliente/horarios", label: "Horários", icon: CalendarDays },
  { href: "/cliente/servicos", label: "Serviços", icon: Sparkles },
  { href: "/cliente/perfil", label: "Perfil", icon: UserRound },
];

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <main className="customer-app">
    <header className="customer-header">
      <Link className="customer-brand" href="/"><span><Scissors /></span><div><strong>Barbearia Stilo Sampa</strong><small><MapPin /> São Paulo · SP</small></div></Link>
      <Link className="customer-avatar" href="/cliente/perfil" aria-label="Abrir perfil de Rafael">RN</Link>
    </header>
    <div className="customer-content">{children}</div>
    <nav className="customer-nav" aria-label="Navegação do cliente">
      {navigation.slice(0, 2).map(({ href, label, icon: Icon }) => <Link className={pathname === href ? "is-active" : ""} href={href} key={href}><Icon /><span>{label}</span></Link>)}
      <Link className="customer-book" href="/b/stilo-sampa" aria-label="Agendar horário"><span><Scissors /></span><small>Agendar</small></Link>
      {navigation.slice(2).map(({ href, label, icon: Icon }) => <Link className={pathname === href ? "is-active" : ""} href={href} key={href}><Icon /><span>{label}</span></Link>)}
    </nav>
  </main>;
}

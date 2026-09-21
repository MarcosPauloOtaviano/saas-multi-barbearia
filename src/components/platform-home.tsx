import Link from "next/link";
import { ArrowRight, CalendarCheck2, Scissors, ShieldCheck, Store, UsersRound } from "lucide-react";
import { CustomerShell } from "@/components/customer-shell";

export function PlatformHome() {
  return <CustomerShell showNavigation={false}>
    <section className="platform-home" aria-labelledby="platform-title">
      <div className="platform-home__hero">
        <span className="platform-home__mark"><Scissors /></span>
        <p className="eyebrow">BarberFlow</p>
        <h1 id="platform-title">Agende em poucos toques.</h1>
        <p>Uma experiência simples para encontrar sua barbearia, escolher o profissional e reservar sem complicação.</p>
        <div className="platform-home__actions"><Link className="button primary" href="/conta">Acompanhar meu horário <ArrowRight /></Link><Link className="button ghost" href="/admin">Acessar painel da equipe</Link></div>
      </div>
      <div className="platform-home__grid">
        <article><Store /><strong>Cada barbearia no seu espaço</strong><p>Links públicos separados, com serviços e equipe do próprio estabelecimento.</p></article>
        <article><CalendarCheck2 /><strong>Sem cadastro obrigatório</strong><p>Reserve como convidado e acompanhe tudo pelo link seguro enviado por e-mail.</p></article>
        <article><ShieldCheck /><strong>Dados protegidos</strong><p>O acesso da equipe fica isolado do agendamento dos clientes.</p></article>
      </div>
      <div className="platform-home__footer"><UsersRound /><span>Você recebeu um link de uma barbearia? <strong>Use o endereço enviado por ela para começar.</strong></span></div>
    </section>
  </CustomerShell>;
}

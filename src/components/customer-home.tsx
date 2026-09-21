"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, RotateCcw, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { BarberAvatar } from "@/components/barber-avatar";
import { CustomerScrollStory } from "@/components/customer-scroll-story";
import { formatCurrency } from "@/lib/format";
import { usePublicShop } from "@/lib/use-public-shop";

export function CustomerHome() {
  const { services, barbers } = usePublicShop();
  const activeServices = services.filter((service) => service.active).slice(0, 3);
  const activeBarbers = barbers.filter((barber) => barber.active);

  return <div className="customer-home">
    <CustomerScrollStory />
    <Link className="customer-primary-cta" href="/b/stilo-sampa"><span><Scissors /></span><div><strong>Agendar novo horário</strong><small>Veja os horários realmente disponíveis</small></div><ArrowRight /></Link>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Serviços</p><h2>Escolha seu atendimento</h2></div><Link href="/cliente/servicos">Ver todos</Link></div>
      {activeServices.length ? <div className="customer-service-scroll">{activeServices.map((service, index) => <Link className="customer-service-card" href={`/b/stilo-sampa?service=${service.id}`} key={service.id}><span className={`customer-service-icon tone-${index + 1}`}><Scissors /></span><strong>{service.name}</strong><small><Clock3 /> {service.durationMinutes} min</small><b>{formatCurrency(service.priceCents)}</b></Link>)}</div> : <p className="customer-empty-copy">Os serviços serão publicados quando a agenda estiver aberta.</p>}
    </section>

    <section className="customer-return-card"><span><RotateCcw /></span><div><p className="eyebrow">Quando você quiser</p><h2>Seu estilo merece tempo.</h2><p>Reserve em poucos passos e receba os detalhes diretamente no seu e-mail.</p><Link href="/b/stilo-sampa">Encontrar um horário <ArrowRight /></Link></div></section>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Equipe</p><h2>Escolha seu profissional</h2></div></div>
      <div className="customer-team-row">{activeBarbers.map((barber) => <article key={barber.id}><BarberAvatar barber={barber} className="customer-team-avatar" sizes="40px" /><div><strong>{barber.name}</strong><small>{barber.role}</small></div><Link href="/b/stilo-sampa" aria-label={`Agendar com ${barber.name}`}><ArrowRight /></Link></article>)}</div>
    </section>

    <section className="customer-trust"><ShieldCheck /><div><strong>Agendamento simples e seguro</strong><p>Confirme ou cancele pelo link enviado ao seu e-mail. Seus dados ficam protegidos.</p></div><CheckCircle2 /></section>
    <footer className="customer-footer"><div><Sparkles /><span><strong>Barbearia Stilo Sampa</strong><small>Agendamento oficial</small></span></div><p><ShieldCheck /> Seus dados são usados somente no atendimento.</p></footer>
  </div>;
}

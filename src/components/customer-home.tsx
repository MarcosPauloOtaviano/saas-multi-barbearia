"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, RotateCcw, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { BarberAvatar } from "@/components/barber-avatar";
import { CustomerScrollStory } from "@/components/customer-scroll-story";
import { formatCurrency } from "@/lib/format";
import type { Barber, Service } from "@/lib/types";

export function CustomerHome({ slug, shopName, services, barbers }: { slug: string; shopName?: string; services: Service[]; barbers: Barber[] }) {
  const activeServices = services.filter((service) => service.active).slice(0, 3);
  const activeBarbers = barbers.filter((barber) => barber.active);
  const bookingHref = `/b/${slug}/agendar`;
  const servicesHref = `/b/${slug}/servicos`;
  const name = shopName ?? "Sua barbearia";

  return <div className="customer-home">
    <section className="customer-mobile-home" aria-labelledby="customer-mobile-title">
      <div className="customer-mobile-home__hero">
        <div className="customer-mobile-home__hero-top">
          <span className="customer-mobile-home__eyebrow">{name}</span>
          <span className="customer-mobile-home__status"><i /> Agenda aberta</span>
        </div>
        <h1 id="customer-mobile-title">Seu próximo corte, sem complicação.</h1>
        <p>Escolha o serviço, o barbeiro e um horário. Tudo em poucos toques e sem precisar criar senha.</p>
        <Link className="customer-mobile-home__cta" href={bookingHref}><span><Scissors /></span><strong>Agendar horário</strong><ArrowRight /></Link>
        <div className="customer-mobile-home__proof" aria-label="Vantagens do agendamento">
          <span><CheckCircle2 /> Sem cadastro</span>
          <span><ShieldCheck /> Confirmação segura</span>
        </div>
      </div>

      <div className="customer-mobile-home__steps" aria-label="Como agendar">
        <div><b>01</b><span>Escolha o serviço</span></div>
        <div><b>02</b><span>Selecione o barbeiro</span></div>
        <div><b>03</b><span>Reserve seu horário</span></div>
      </div>
    </section>
    <CustomerScrollStory bookingHref={bookingHref} />
    <Link className="customer-primary-cta" href={bookingHref}><span><Scissors /></span><div><strong>Agendar novo horário</strong><small>Veja os horários realmente disponíveis</small></div><ArrowRight /></Link>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Serviços</p><h2>Escolha seu atendimento</h2></div><Link href={servicesHref}>Ver todos</Link></div>
      {activeServices.length ? <div className="customer-service-scroll">{activeServices.map((service, index) => <Link className="customer-service-card" href={`${bookingHref}?service=${service.id}`} key={service.id}><span className={`customer-service-icon tone-${index + 1}`}><Scissors /></span><strong>{service.name}</strong><small><Clock3 /> {service.durationMinutes} min</small><b>{formatCurrency(service.priceCents)}</b></Link>)}</div> : <p className="customer-empty-copy">Os serviços serão publicados quando a agenda estiver aberta.</p>}
    </section>

    <section className="customer-return-card"><span><RotateCcw /></span><div><p className="eyebrow">Quando você quiser</p><h2>Seu estilo merece tempo.</h2><p>Reserve em poucos passos e receba os detalhes diretamente no seu e-mail.</p><Link href={bookingHref}>Encontrar um horário <ArrowRight /></Link></div></section>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Equipe</p><h2>Escolha seu profissional</h2></div></div>
      <div className="customer-team-row">{activeBarbers.map((barber) => <article key={barber.id}><BarberAvatar barber={barber} className="customer-team-avatar" sizes="40px" /><div><strong>{barber.name}</strong><small>{barber.role}</small></div><Link href={bookingHref} aria-label={`Agendar com ${barber.name}`}><ArrowRight /></Link></article>)}</div>
    </section>

    <section className="customer-trust"><ShieldCheck /><div><strong>Agendamento simples e seguro</strong><p>Confirme ou cancele pelo link enviado ao seu e-mail. Seus dados ficam protegidos.</p></div><CheckCircle2 /></section>
    <footer className="customer-footer"><div><Sparkles /><span><strong>{name}</strong><small>Agendamento oficial</small></span></div><p><ShieldCheck /> Seus dados são usados somente no atendimento.</p></footer>
  </div>;
}

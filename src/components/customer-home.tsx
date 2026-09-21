"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Package, RotateCcw, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { BarberAvatar } from "@/components/barber-avatar";
import { formatCurrency } from "@/lib/format";
import type { Barber, Product, Service } from "@/lib/types";

export function CustomerHome({ slug, shopName, services, barbers, products }: { slug: string; shopName?: string; services: Service[]; barbers: Barber[]; products: Product[] }) {
  const allActiveServices = services.filter((service) => service.active);
  const activeServices = allActiveServices.slice(0, 3);
  const activeBarbers = barbers.filter((barber) => barber.active);
  const activeProducts = products.filter((product) => product.active).slice(0, 3);
  const bookingHref = `/b/${slug}/agendar`;
  const servicesHref = `/b/${slug}/servicos`;
  const name = shopName ?? "Sua barbearia";

  return <div className="customer-home">
    <section className="customer-professional-hero" aria-labelledby="customer-professional-title">
      <div className="customer-professional-hero__content">
        <p className="eyebrow">Agendamento oficial</p>
        <h1 id="customer-professional-title">Seu próximo corte, <em>no seu horário.</em></h1>
        <p>Escolha o serviço, o profissional e um horário disponível. Sem cadastro obrigatório e com confirmação segura por e-mail.</p>
        <div className="customer-professional-hero__actions"><Link className="button primary" href={bookingHref}><Scissors /> Agendar horário <ArrowRight /></Link><Link className="button ghost" href={servicesHref}>Ver serviços</Link></div>
        <div className="customer-professional-hero__proof"><span><CheckCircle2 /> Sem cadastro</span><span><ShieldCheck /> Confirmação segura</span></div>
      </div>
      <aside className="customer-professional-hero__card" aria-label={`Resumo de ${name}`}><div className="customer-professional-hero__card-top"><span>Agendamento online</span><b>Página oficial</b></div><h2>{name}</h2><p>Um atendimento simples, com as informações certas antes de confirmar.</p><div className="customer-professional-hero__stats"><span><strong>{allActiveServices.length}</strong><small>serviços</small></span><span><strong>{activeBarbers.length}</strong><small>profissionais</small></span><span><strong>4</strong><small>etapas</small></span></div><div className="customer-professional-hero__card-foot"><Scissors /><span>Escolha o seu próximo horário</span></div></aside>
    </section>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Serviços</p><h2>Escolha seu atendimento</h2></div><Link href={servicesHref}>Ver todos</Link></div>
      {activeServices.length ? <div className="customer-service-scroll">{activeServices.map((service, index) => <Link className="customer-service-card" href={`${bookingHref}?service=${service.id}`} key={service.id}><span className={`customer-service-icon tone-${index + 1}`}><Scissors /></span><strong>{service.name}</strong><small><Clock3 /> {service.durationMinutes} min</small><b>{formatCurrency(service.priceCents)}</b></Link>)}</div> : <p className="customer-empty-copy">Os serviços serão publicados quando a agenda estiver aberta.</p>}
    </section>

    {activeProducts.length > 0 && <section className="customer-section"><div className="customer-section-head"><div><p className="eyebrow">Para levar</p><h2>Cuidados para continuar em casa</h2></div><Link href={`/b/${slug}/produtos`}>Ver produtos</Link></div><div className="customer-product-scroll">{activeProducts.map((product) => <Link className="customer-product-card" href={`/b/${slug}/produtos`} key={product.id}><span className="customer-product-icon"><Package /></span><strong>{product.name}</strong><b>{formatCurrency(product.priceCents)}</b></Link>)}</div></section>}

    <section className="customer-return-card"><span><RotateCcw /></span><div><p className="eyebrow">Quando você quiser</p><h2>Seu estilo merece tempo.</h2><p>Reserve em poucos passos e receba os detalhes diretamente no seu e-mail.</p><Link href={bookingHref}>Encontrar um horário <ArrowRight /></Link></div></section>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Equipe</p><h2>Escolha seu profissional</h2></div></div>
      <div className="customer-team-row">{activeBarbers.map((barber) => <article key={barber.id}><BarberAvatar barber={barber} className="customer-team-avatar" sizes="40px" /><div><strong>{barber.name}</strong><small>{barber.role}</small></div><Link href={bookingHref} aria-label={`Agendar com ${barber.name}`}><ArrowRight /></Link></article>)}</div>
    </section>

    <section className="customer-trust"><ShieldCheck /><div><strong>Agendamento simples e seguro</strong><p>Confirme ou cancele pelo link enviado ao seu e-mail. Seus dados ficam protegidos.</p></div><CheckCircle2 /></section>
    <footer className="customer-footer"><div><Sparkles /><span><strong>{name}</strong><small>Agendamento oficial</small></span></div><p><ShieldCheck /> Seus dados são usados somente no atendimento.</p></footer>
  </div>;
}

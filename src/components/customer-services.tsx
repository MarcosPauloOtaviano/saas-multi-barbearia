"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Scissors, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { usePublicShop } from "@/lib/use-public-shop";

export function CustomerServices({ slug }: { slug: string }) {
  const { services, loading } = usePublicShop(slug);
  return <section className="customer-page"><div className="customer-page-title"><p className="eyebrow">Menu de cuidados</p><h1>Escolha sua experiência</h1><p>Preços claros, tempo estimado e profissionais preparados para você.</p></div>
    <div className="customer-service-list">{loading && <div className="customer-loading">Carregando serviços…</div>}{services.filter((service) => service.active).map((service, index) => <article key={service.id}><span className={`customer-service-icon tone-${(index % 3) + 1}`}><Scissors /></span><div><h2>{service.name}</h2><p>{service.description}</p><small><Clock3 /> {service.durationMinutes} min</small></div><div><strong>{formatCurrency(service.priceCents)}</strong><Link href={`/b/${slug}/agendar?service=${service.id}`}>Escolher <ArrowRight /></Link></div></article>)}</div>
    <div className="customer-experience-note"><Sparkles /><div><strong>Não sabe qual escolher?</strong><p>Escolha “Primeiro disponível” no agendamento e conte o que você procura ao chegar.</p></div></div>
  </section>;
}

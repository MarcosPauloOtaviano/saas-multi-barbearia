"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck2, CheckCircle2, Clock3, MapPin, RotateCcw, Scissors, ShieldCheck, Sparkles, Star, UserRound } from "lucide-react";
import { BarberAvatar } from "@/components/barber-avatar";
import { useDemo } from "@/components/demo-provider";
import { formatCurrency } from "@/lib/format";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { usePublicShop } from "@/lib/use-public-shop";

export function CustomerHome() {
  const { customerAppointments: appointments } = useDemo();
  const { services, barbers } = usePublicShop();
  const next = appointments.find((item) => item.clientId === "client-rafael" && !["cancelled", "completed", "no_show"].includes(item.status));
  const favorites = services.filter((service) => service.active).slice(0, 3);

  return <div className="customer-home">
    <section className="customer-welcome"><div><p className="eyebrow">Stilo Sampa · agendamento</p><h1>{hasSupabaseEnv ? "Seu próximo corte começa aqui." : "Olá, Rafael."}</h1><p>{hasSupabaseEnv ? "Escolha o serviço, o profissional e o horário que combinam com você." : "Seu próximo momento na barbearia já está organizado."}</p></div><Link className="button primary customer-desktop-cta" href="/b/stilo-sampa">Agendar horário <ArrowRight /></Link></section>

    {!hasSupabaseEnv && next && <section className="customer-next-card" aria-labelledby="customer-next-title">
      <div className="customer-next-top"><span><CalendarCheck2 /> Próximo horário</span><b><i /> Confirmado</b></div>
      <div className="customer-next-main"><div className="customer-date-block"><strong>20</strong><span>SET<small>Domingo</small></span></div><div><p id="customer-next-title">{next.serviceName}</p><h2>{next.time}</h2><span><UserRound /> com {next.barberName} · {next.durationMinutes} min</span></div></div>
      <div className="customer-next-actions"><Link href="/cliente/horarios">Ver detalhes</Link><Link href="/b/stilo-sampa">Remarcar</Link></div>
    </section>}

    <Link className="customer-primary-cta" href="/b/stilo-sampa"><span><Scissors /></span><div><strong>Agendar novo horário</strong><small>Veja os melhores horários disponíveis</small></div><ArrowRight /></Link>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Seu estilo favorito</p><h2>Agende de novo</h2></div><Link href="/cliente/servicos">Ver todos</Link></div>
      <div className="customer-service-scroll">{favorites.map((service, index) => <Link className="customer-service-card" href={`/b/stilo-sampa?service=${service.id}`} key={service.id}><span className={`customer-service-icon tone-${index + 1}`}><Scissors /></span><strong>{service.name}</strong><small><Clock3 /> {service.durationMinutes} min</small><b>{formatCurrency(service.priceCents)}</b></Link>)}</div>
    </section>

    <section className="customer-return-card"><span><RotateCcw /></span><div><p className="eyebrow">{hasSupabaseEnv ? "Quando você quiser" : "Hora de renovar"}</p><h2>{hasSupabaseEnv ? "Seu estilo merece tempo." : "Já faz quase 30 dias."}</h2><p>{hasSupabaseEnv ? "Reserve em poucos passos e receba os detalhes diretamente no seu e-mail." : "Seu corte costuma ficar no ponto agora. Quer garantir o horário desta semana?"}</p><Link href="/b/stilo-sampa">Encontrar um horário <ArrowRight /></Link></div></section>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Equipe</p><h2>Com quem você se sente bem</h2></div></div>
      <div className="customer-team-row">{barbers.filter((barber) => barber.active).map((barber) => <article key={barber.id}><BarberAvatar barber={barber} className="customer-team-avatar" sizes="40px" /><div><strong>{barber.name}</strong><small><Star /> 4,9 · {barber.role}</small></div><Link href="/b/stilo-sampa" aria-label={`Agendar com ${barber.name}`}><ArrowRight /></Link></article>)}</div>
    </section>

    <section className="customer-trust"><ShieldCheck /><div><strong>Agendamento simples e seguro</strong><p>Confirme ou cancele pelo link enviado ao seu e-mail. Seus dados ficam protegidos.</p></div><CheckCircle2 /></section>
    <footer className="customer-footer"><div><Sparkles /><span><strong>Barbearia Stilo Sampa</strong><small>Seg–Sex 9h–19h · Sáb 8h–17h</small></span></div><p><MapPin /> São Paulo · SP</p><Link href="/login">Área da equipe</Link></footer>
  </div>;
}

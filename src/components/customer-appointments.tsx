"use client";

import Link from "next/link";
import { CalendarDays, Check, ChevronRight, Clock3, History, Scissors, UserRound, X } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { formatCurrency } from "@/lib/format";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export function CustomerAppointments() {
  const { customerAppointments: appointments, updateAppointmentStatus } = useDemo();
  const own = appointments.filter((item) => item.clientId === "client-rafael");
  const upcoming = own.filter((item) => !["completed", "cancelled", "no_show"].includes(item.status));
  const history = own.filter((item) => ["completed", "cancelled", "no_show"].includes(item.status));

  if (hasSupabaseEnv) return <section className="customer-page"><div className="customer-page-title"><p className="eyebrow">Sua agenda</p><h1>Meus horários</h1><p>Use o link seguro recebido por e-mail para confirmar ou cancelar cada agendamento.</p></div><div className="customer-access-card"><span><CalendarDays /></span><h2>Abra seu e-mail</h2><p>Após reservar, enviamos um link pessoal para acompanhar o horário sem criar senha.</p><Link className="button primary" href="/b/stilo-sampa">Fazer novo agendamento</Link></div></section>;

  return <section className="customer-page"><div className="customer-page-title"><p className="eyebrow">Sua agenda</p><h1>Meus horários</h1><p>Acompanhe, confirme ou reorganize seus próximos cuidados.</p></div>
    <div className="customer-page-section"><div className="customer-section-head"><div><h2>Próximos</h2></div><span>{upcoming.length}</span></div>{upcoming.map((item) => <article className="customer-appointment" key={item.id}><div className="customer-appointment-date"><strong>{item.date.slice(-2)}</strong><span>SET</span></div><div className="customer-appointment-copy"><span className={`customer-status ${item.status}`}><i /> {item.status === "confirmed" ? "Confirmado" : "Aguardando confirmação"}</span><h2>{item.serviceName}</h2><p><Clock3 /> {item.time} · {item.durationMinutes} min</p><p><UserRound /> {item.barberName}</p><strong>{formatCurrency(item.priceCents)}</strong></div><div className="customer-appointment-actions">{item.status === "pending" && <button onClick={() => updateAppointmentStatus(item.id, "confirmed")}><Check /> Confirmar</button>}<Link href="/b/stilo-sampa">Remarcar</Link><button className="danger" onClick={() => updateAppointmentStatus(item.id, "cancelled")}><X /> Cancelar</button></div></article>)}{upcoming.length === 0 && <div className="customer-empty"><CalendarDays /><h2>Nenhum horário marcado</h2><p>Escolha um serviço e encontre o melhor momento para você.</p><Link className="button primary" href="/b/stilo-sampa">Agendar agora</Link></div>}</div>
    <div className="customer-page-section"><div className="customer-section-head"><div><h2>Histórico</h2></div><History /></div>{history.map((item) => <Link className="customer-history-row" href="/b/stilo-sampa" key={item.id}><span><Scissors /></span><div><strong>{item.serviceName}</strong><small>18 set · {item.barberName}</small></div><b>{formatCurrency(item.priceCents)}</b><ChevronRight /></Link>)}</div>
  </section>;
}

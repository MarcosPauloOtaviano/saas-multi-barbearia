"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, CircleCheckBig, Clock3, Sparkles, UserRound } from "lucide-react";
import { useDemo } from "@/components/demo-provider";

const statusLabel = { pending: "Aguardando", confirmed: "Confirmado", in_progress: "Em atendimento", completed: "Concluído", cancelled: "Cancelado", no_show: "Faltou" };

export function DashboardHome() {
  const { appointments, clients, role } = useDemo();
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const today = appointments.filter((item) => item.date === todayIso && !["cancelled", "no_show"].includes(item.status)).sort((a, b) => a.time.localeCompare(b.time));
  const confirmed = today.filter((item) => item.status === "confirmed").length;
  const pending = today.filter((item) => item.status === "pending").length;
  const next = today[0];
  const returnClient = clients.find((client) => client.id === "client-caio");

  return (
    <>
      <div className="welcome-line"><div><p className="eyebrow">{role === "barber" ? "Minha rotina" : "Visão geral"}</p><h1>{role === "barber" ? "Sua agenda, Leonardo." : "Bom dia, Stilo Sampa."}</h1></div><Link className="button primary small" href="/agenda?novo=1">+ Novo agendamento</Link></div>
      <div className="dashboard-grid">
        <section className="hero-card" aria-labelledby="proximo-cliente">
          <div className="hero-card__topline"><span><Sparkles size={15} /> Próximo cliente</span><span className="status-pill"><span /> Confirmado</span></div>
          <div className="next-appointment">
            <div><p className="next-time">{next?.time ?? "—"}</p><p className="time-until">em 28 minutos</p></div>
            <div className="appointment-copy"><h2 id="proximo-cliente">{next?.clientName ?? "Agenda livre"}</h2><p>{next ? `${next.serviceName} · ${next.durationMinutes} min` : "Nenhum atendimento próximo"}</p></div>
          </div>
          <Link className="primary-action" href={`/agenda?appointment=${next?.id ?? ""}`}>Ver agendamento <ChevronRight size={18} /></Link>
        </section>

        <section className="summary-card" aria-label="Resumo do dia">
          <div className="section-heading"><div><p className="eyebrow">Hoje</p><h2>Seu dia em um olhar</h2></div><span className="progress-label">{confirmed} de {today.length}</span></div>
          <div className="metrics-row">
            <div className="metric"><strong>{today.length}</strong><span>atendimentos</span></div>
            <div className="metric"><strong>{confirmed}</strong><span>confirmados</span></div>
            <div className="metric"><strong>{pending}</strong><span>aguardando</span></div>
          </div>
          <div className="progress-track"><span style={{ width: `${today.length ? (confirmed / today.length) * 100 : 0}%` }} /></div>
        </section>

        <section className="alerts-card" aria-labelledby="alertas-titulo">
          <div className="section-heading compact"><div><p className="eyebrow">Precisa de atenção</p><h2 id="alertas-titulo">Avisos</h2></div><Link className="text-button" href="/notificacoes">Ver todos</Link></div>
          <Link className="alert-item" href="/agenda?status=pending"><span className="alert-icon amber"><Clock3 size={19} /></span><span><strong>{pending} {pending === 1 ? "cliente ainda não confirmou" : "clientes ainda não confirmaram"}</strong><small>Os lembretes automáticos já estão programados</small></span><ChevronRight size={18} /></Link>
          {role !== "barber" && returnClient && <Link className="alert-item" href={`/clientes?client=${returnClient.id}`}><span className="alert-icon blue"><UserRound size={19} /></span><span><strong>{returnClient.name} costuma voltar nesta semana</strong><small>Último atendimento há 31 dias</small></span><ChevronRight size={18} /></Link>}
        </section>

        <section className="schedule-card" aria-labelledby="agenda-titulo">
          <div className="section-heading compact"><div><p className="eyebrow">Agenda</p><h2 id="agenda-titulo">Próximos horários</h2></div><span className="date-chip"><CalendarDays size={16} /> Hoje</span></div>
          <div className="schedule-list">
            {today.slice(0, 4).map((item) => (
              <Link href={`/agenda?appointment=${item.id}`} className="schedule-row" key={item.id}>
                <time>{item.time}</time><span className="schedule-line" />
                <span className="schedule-person"><strong>{item.clientName}</strong><small>{item.serviceName} · {item.barberName}</small></span>
                <span className={`booking-state state-${item.status}`}>{item.status === "confirmed" && <CircleCheckBig size={14} />}{statusLabel[item.status]}</span>
              </Link>
            ))}
          </div>
          <Link className="secondary-action" href="/agenda">Abrir agenda completa <ChevronRight size={17} /></Link>
        </section>
      </div>
    </>
  );
}

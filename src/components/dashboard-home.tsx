"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, CircleCheckBig, Clock3, Sparkles, UserRound } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { useAdminBase } from "@/lib/admin-route";

const statusLabel = { pending: "Aguardando", confirmed: "Confirmado", in_progress: "Em atendimento", completed: "Concluído", cancelled: "Cancelado", no_show: "Faltou" };

export function DashboardHome() {
  const { appointments, clients, role, currentUserName } = useAppData();
  const base = useAdminBase();
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const today = appointments.filter((item) => item.date === todayIso && !["cancelled", "no_show"].includes(item.status)).sort((a, b) => a.time.localeCompare(b.time));
  const confirmed = today.filter((item) => item.status === "confirmed").length;
  const pending = today.filter((item) => item.status === "pending").length;
  const nowTime = new Intl.DateTimeFormat("pt-BR", {timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
  const next = today.find(item => item.status === "in_progress" || (["pending","confirmed"].includes(item.status) && item.time >= nowTime));
  const returnClient = clients.find((client) => client.averageReturnDays);

  return (
    <>
      <div className="welcome-line"><div><p className="eyebrow">{role === "barber" ? "Minha rotina" : "Visão geral"}</p><h1>Olá, {currentUserName}.</h1></div><Link className="button primary small" href={`${base}/agenda?novo=1`}>+ Novo agendamento</Link></div>
      {(role==="owner"||role==="manager")&&<nav className="management-shortcuts" aria-label="Administração"><Link href={`${base}/servicos`}>Serviços</Link><Link href={`${base}/produtos`}>Produtos</Link><Link href={`${base}/equipe`}>Equipe</Link><Link href={`${base}/horarios`}>Dias e horários</Link></nav>}
      <div className="dashboard-grid">
        <section className="hero-card" aria-labelledby="proximo-cliente">
          <div className="hero-card__topline"><span><Sparkles size={15} /> Próximo cliente</span>{next&&<span className="status-pill">{statusLabel[next.status]}</span>}</div>
          <div className="next-appointment">
            <div><p className="next-time">{next?.time ?? "—"}</p><p className="time-until">{next?"Hoje":""}</p></div>
            <div className="appointment-copy"><h2 id="proximo-cliente">{next?.clientName ?? "Agenda livre"}</h2><p>{next ? `${next.serviceName} · ${next.durationMinutes} min` : "Nenhum atendimento próximo"}</p></div>
          </div>
          <Link className="primary-action" href={`${base}/agenda${next ? `?appointment=${next.id}` : ""}`}>Ver agenda <ChevronRight size={18} /></Link>
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
          <div className="section-heading compact"><div><p className="eyebrow">Precisa de atenção</p><h2 id="alertas-titulo">Avisos</h2></div><Link className="text-button" href={`${base}/notificacoes`}>Ver todos</Link></div>
          <Link className="alert-item" href={`${base}/agenda?status=pending`}><span className="alert-icon amber"><Clock3 size={19} /></span><span><strong>{pending} {pending === 1 ? "cliente ainda não confirmou" : "clientes ainda não confirmaram"}</strong><small>{pending ? "Os lembretes automáticos já estão programados" : "Nenhuma pendência hoje"}</small></span><ChevronRight size={18} /></Link>
          {role !== "barber" && returnClient && <Link className="alert-item" href={`${base}/clientes?client=${returnClient.id}`}><span className="alert-icon blue"><UserRound size={19} /></span><span><strong>{returnClient.name} costuma voltar nesta semana</strong><small>Confira o histórico do cliente</small></span><ChevronRight size={18} /></Link>}
        </section>

        <section className="schedule-card" aria-labelledby="agenda-titulo">
          <div className="section-heading compact"><div><p className="eyebrow">Agenda</p><h2 id="agenda-titulo">Próximos horários</h2></div><span className="date-chip"><CalendarDays size={16} /> Hoje</span></div>
          <div className="schedule-list">
            {today.slice(0, 4).map((item) => (
              <Link href={`${base}/agenda?appointment=${item.id}`} className="schedule-row" key={item.id}>
                <time>{item.time}</time><span className="schedule-line" />
                <span className="schedule-person"><strong>{item.clientName}</strong><small>{item.serviceName} · {item.barberName}</small></span>
                <span className={`booking-state state-${item.status}`}>{item.status === "confirmed" && <CircleCheckBig size={14} />}{statusLabel[item.status]}</span>
              </Link>
            ))}
          </div>
          <Link className="secondary-action" href={`${base}/agenda`}>Abrir agenda completa <ChevronRight size={17} /></Link>
        </section>
      </div>
    </>
  );
}

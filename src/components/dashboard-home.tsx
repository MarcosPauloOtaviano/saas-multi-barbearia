"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, CalendarDays, ChevronRight, CircleCheckBig, Clock3, Sparkles, UserRound, Volume2 } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { useAdminBase } from "@/lib/admin-route";

const statusLabel = { pending: "Aguardando", confirmed: "Confirmado", in_progress: "Em atendimento", completed: "Concluído", cancelled: "Cancelado", no_show: "Faltou" };

export function DashboardHome() {
  const { appointments, clients, notifications, markNotificationRead, role, currentUserName, notificationPermission, requestNotificationPermission } = useAppData();
  const base = useAdminBase();
  const [notificationPromptDismissed, setNotificationPromptDismissed] = useState(false);
  const [requestPanel, setRequestPanel] = useState<"appointments" | "notifications">("appointments");
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const today = appointments.filter((item) => item.date === todayIso && !["cancelled", "no_show"].includes(item.status)).sort((a, b) => a.time.localeCompare(b.time));
  const confirmed = today.filter((item) => item.status === "confirmed").length;
  const pending = today.filter((item) => item.status === "pending").length;
  const pendingRequests = appointments.filter((item) => item.status === "pending").sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const pendingAppointments = pendingRequests.slice(0, 3);
  const unreadNotifications = notifications.filter((item) => !item.read);
  const notificationItems = notifications.slice(0, 4);
  const requestDateLabel = (date: string, time: string) => date === todayIso ? `Hoje, ${time}` : `${date.split("-").reverse().slice(0, 2).join("/")} às ${time}`;
  const nowTime = new Intl.DateTimeFormat("pt-BR", {timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
  const next = today.find(item => item.status === "in_progress" || (["pending","confirmed"].includes(item.status) && item.time >= nowTime));
  const returnClient = clients.find((client) => client.averageReturnDays);
  const canAskForNotifications = notificationPermission !== "unsupported" && notificationPermission !== "granted" && !notificationPromptDismissed;

  // A new booking is shown first in the dashboard's “Novos agendamentos”
  // panel. Once that panel is visible, the matching alert is no longer new in
  // the Avisos tab either, keeping both counters consistent.
  useEffect(() => {
    if (requestPanel !== "appointments" || !pendingRequests.length) return;
    const pendingIds = new Set(pendingRequests.map((appointment) => appointment.id));
    notifications
      .filter((note) => !note.read && [...pendingIds].some((id) => note.actionUrl.includes(`appointment=${id}`)))
      .forEach((note) => void markNotificationRead(note.id));
  }, [markNotificationRead, notifications, pendingRequests, requestPanel]);

  return (
    <>
      <div className="welcome-line"><div><p className="eyebrow">{role === "barber" ? "Minha rotina" : "Visão geral"}</p><h1>Olá, {currentUserName}.</h1></div><Link className="button primary small" href={`${base}/agenda?novo=1`}>+ Novo agendamento</Link></div>
      {canAskForNotifications && <section className="notification-setup-card" aria-live="polite"><span className="notification-setup-icon"><BellRing size={21} /></span><div><strong>Quer ouvir novos pedidos na hora?</strong><p>Ative o aviso deste aparelho para receber som e notificação quando um cliente solicitar horário.</p></div><div className="notification-setup-actions"><button className="button primary small" onClick={() => void requestNotificationPermission()}><Volume2 size={15} />Ativar avisos</button><button className="text-button" onClick={() => setNotificationPromptDismissed(true)}>Agora não</button></div></section>}
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

        <section className={`alerts-card requests-panel ${pendingRequests.length ? "has-pending" : ""}`} aria-labelledby="alertas-titulo" aria-live="polite">
          <div className="section-heading compact"><div><p className="eyebrow">Precisa de atenção</p><h2 id="alertas-titulo">Central de avisos</h2></div><span className="count-badge">{pendingRequests.length + unreadNotifications.length}</span></div>
          <div className="dashboard-feed-tabs" role="tablist" aria-label="Avisos do painel">
            <button type="button" role="tab" aria-selected={requestPanel === "appointments"} className={requestPanel === "appointments" ? "is-active" : ""} onClick={() => setRequestPanel("appointments")}>Novos agendamentos <b>{pendingRequests.length}</b></button>
            <button type="button" role="tab" aria-selected={requestPanel === "notifications"} className={requestPanel === "notifications" ? "is-active" : ""} onClick={() => setRequestPanel("notifications")}>Avisos <b>{unreadNotifications.length}</b></button>
          </div>
          {requestPanel === "appointments" ? <>
            {pendingAppointments.length ? pendingAppointments.map((item) => <Link className="alert-item request-item" href={`${base}/agenda?appointment=${item.id}`} key={item.id}><span className="alert-icon amber"><Clock3 size={19} /></span><span><strong>{item.clientName}</strong><small>{requestDateLabel(item.date, item.time)} · {item.serviceName} · {item.barberName}</small></span><ChevronRight size={18} /></Link>) : <div className="requests-empty"><span className="alert-icon"><CircleCheckBig size={19} /></span><div><strong>Tudo em dia</strong><small>Nenhuma solicitação aguardando confirmação.</small></div></div>}
            <Link className="alert-item requests-footer" href={`${base}/agenda?status=pending`}><span><strong>Ver agenda e responder</strong><small>{pendingRequests.length ? "Confirme ou ajuste os horários pendentes" : "Acompanhe todos os próximos horários"}</small></span><ChevronRight size={18} /></Link>
          </> : <>
            {notificationItems.length ? notificationItems.map((item) => { const href = item.actionUrl.startsWith("/admin/") ? item.actionUrl : item.actionUrl.startsWith("/") ? `${base}${item.actionUrl}` : `${base}/notificacoes`; return <Link className={`alert-item request-item ${!item.read ? "is-unread" : ""}`} href={href} onClick={() => void markNotificationRead(item.id)} key={item.id}><span className="alert-icon blue"><BellRing size={18} /></span><span><strong>{item.title}</strong><small>{item.body} · {item.time}</small></span><ChevronRight size={18} /></Link>; }) : <div className="requests-empty"><span className="alert-icon"><CircleCheckBig size={19} /></span><div><strong>Nenhum aviso novo</strong><small>As atualizações da agenda aparecerão aqui.</small></div></div>}
            <Link className="alert-item requests-footer" href={`${base}/notificacoes`}><span><strong>Ver todos os avisos</strong><small>Confirmações, cancelamentos e retornos</small></span><ChevronRight size={18} /></Link>
          </>}
          {role !== "barber" && returnClient && requestPanel === "appointments" && <Link className="alert-item" href={`${base}/clientes?client=${returnClient.id}`}><span className="alert-icon blue"><UserRound size={19} /></span><span><strong>{returnClient.name} costuma voltar nesta semana</strong><small>Confira o histórico do cliente</small></span><ChevronRight size={18} /></Link>}
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

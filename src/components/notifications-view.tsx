"use client";

import Link from "next/link";
import { Bell, CalendarPlus, Check, CircleX, Clock3, Sparkles } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useAppData } from "@/components/app-data-provider";
import { useAdminBase } from "@/lib/admin-route";

const icons = { booking: CalendarPlus, confirmation: Check, cancellation: CircleX, upcoming: Clock3, return: Sparkles };

export function NotificationsView() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppData();
  const base = useAdminBase();
  const unread = notifications.filter((note) => !note.read).length;
  return <>
    <PageTitle eyebrow="Assistente" title="Avisos" description="Tudo que mudou na agenda e o que pede sua atenção." action={<button className="button subtle" onClick={markAllNotificationsRead}><Check size={17} /> Marcar tudo como lido</button>} />
    <div className="notification-layout">
      <section className="content-card notification-feed">
        <div className="section-heading compact"><div><p className="eyebrow">Recentes</p><h2>{unread} avisos não lidos</h2></div></div>
        {notifications.map((note) => { const Icon = icons[note.type]; const href = note.actionUrl.startsWith("/") ? `${base}${note.actionUrl}` : `${base}/notificacoes`; return <Link href={href} className={`notification-row ${!note.read ? "is-unread" : ""}`} onClick={() => markNotificationRead(note.id)} key={note.id}><span className={`notification-icon ${note.type}`}><Icon /></span><span><strong>{note.title}</strong><p>{note.body}</p><small>{note.time}</small></span>{!note.read && <i />}</Link>; })}
      </section>
      <aside className="content-card notification-summary"><span className="large-bell"><Bell /></span><h2>Você está em dia</h2><p>O assistente acompanha confirmações, cancelamentos, próximos horários e clientes prontos para retornar.</p><div><span><strong>E-mail</strong><small>24h e 2h antes</small></span><b>Ativo</b></div><div><span><strong>Push no iPhone</strong><small>Ao instalar o app</small></span><b className="neutral">Disponível</b></div><div><span><strong>WhatsApp</strong><small>Preparado para ativação futura</small></span><b className="neutral">Futuro</b></div></aside>
    </div>
  </>;
}

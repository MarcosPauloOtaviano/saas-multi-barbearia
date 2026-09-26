"use client";

import { useState } from "react";
import { CalendarRange, CircleDollarSign, Scissors, UserRoundCheck, UsersRound } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useAppData } from "@/components/app-data-provider";
import { formatCurrency } from "@/lib/format";

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ReportsView({ personalOnly = false }: { personalOnly?: boolean }) {
  const { appointments, clients, services, barbers, role, currentUserName } = useAppData();
  const isPersonal = personalOnly || role === "barber";
  const [period, setPeriod] = useState<"month" | "all">("month");
  const monthParts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo" }).formatToParts(new Date());
  const currentMonth = `${monthParts.find((part) => part.type === "year")?.value}-${monthParts.find((part) => part.type === "month")?.value}`;
  const completed = appointments.filter((item) => item.status === "completed" && (period === "all" || item.date.startsWith(currentMonth)));
  const revenue = completed.reduce((sum, item) => sum + item.priceCents, 0);
  const newClients = clients.filter((client) => client.visits <= 1).length;
  const recurringClients = clients.filter((client) => client.visits > 1).length;
  const returnRate = clients.length ? Math.round((recurringClients / clients.length) * 100) : 0;
  const byWeekday = weekdayLabels.map((label, index) => ({ label, count: completed.filter((item) => new Date(`${item.date}T12:00:00`).getDay() === index).length }));
  const peak = Math.max(1, ...byWeekday.map((day) => day.count));
  const serviceRanking = services.map((service) => ({ service, count: completed.filter((item) => (item.serviceIds ?? [item.serviceId]).includes(service.id)).length })).sort((a, b) => b.count - a.count);
  const barberRanking = barbers.map((barber) => ({ barber, jobs: completed.filter((item) => item.barberId === barber.id) })).sort((a, b) => b.jobs.length - a.jobs.length);
  const topBarberCount = Math.max(1, ...barberRanking.map((item) => item.jobs.length));

  if (isPersonal) {
    const workedMinutes = completed.reduce((sum, item) => sum + item.durationMinutes, 0);
    const personalServiceRanking = services.map((service) => ({ service, count: completed.filter((item) => (item.serviceIds ?? [item.serviceId]).includes(service.id)).length })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
    const personalClientCount = new Set(completed.map((item) => item.clientId)).size;
    const personalPeak = Math.max(1, ...personalServiceRanking.map((item) => item.count));
    return <>
      <PageTitle eyebrow="Minha produção" title={`Seu desempenho, ${currentUserName}`} description="Acompanhe somente os atendimentos e o valor dos serviços feitos por você." action={<button className="button subtle" onClick={() => setPeriod((current) => current === "month" ? "all" : "month")}><CalendarRange size={17} /> {period === "month" ? "Este mês" : "Todo o período"}</button>} />
      <div className="kpi-grid">
        <article className="kpi-card"><span className="kpi-icon green"><Scissors /></span><div><small>Atendimentos concluídos</small><strong>{completed.length}</strong><p>{period === "month" ? "Neste mês" : "Todo o período"}</p></div></article>
        <article className="kpi-card"><span className="kpi-icon copper"><CircleDollarSign /></span><div><small>Valor dos seus serviços</small><strong>{formatCurrency(revenue)}</strong><p>Somente atendimentos concluídos</p></div></article>
        <article className="kpi-card"><span className="kpi-icon blue"><CalendarRange /></span><div><small>Tempo trabalhado</small><strong>{Math.floor(workedMinutes / 60)}h {workedMinutes % 60}min</strong><p>Tempo reservado em serviços</p></div></article>
        <article className="kpi-card"><span className="kpi-icon amber"><UsersRound /></span><div><small>Clientes atendidos</small><strong>{personalClientCount}</strong><p>Clientes que passaram com você</p></div></article>
      </div>
      <div className="reports-grid">
        <section className="content-card chart-card"><div className="section-heading compact"><div><p className="eyebrow">Seu movimento</p><h2>Atendimentos por dia</h2></div></div><div className="bar-chart" aria-label="Gráfico dos seus atendimentos por dia">{byWeekday.map((day) => <div className="bar-column" key={day.label}><span>{day.count}</span><i style={{ height: `${(day.count / peak) * 100}%` }} /><small>{day.label}</small></div>)}</div></section>
        <section className="content-card personal-production-card"><div className="section-heading compact"><div><p className="eyebrow">Seus serviços</p><h2>Cortes mais realizados</h2></div></div>{personalServiceRanking.length ? <div className="ranking-list">{personalServiceRanking.slice(0, 6).map(({ service, count }, index) => <div key={service.id}><span className="rank-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{service.name}</strong><small>{count} {count === 1 ? "atendimento" : "atendimentos"}</small></span><i><b style={{ width: `${(count / personalPeak) * 100}%` }} /></i></div>)}</div> : <p className="empty-copy">Seus atendimentos concluídos aparecerão aqui.</p>}</section>
      </div>
    </>;
  }

  return <>
    <PageTitle eyebrow="Desempenho" title="Relatórios" description="Indicadores formados apenas por atendimentos reais." action={<button className="button subtle" onClick={() => setPeriod((current) => current === "month" ? "all" : "month")}><CalendarRange size={17} /> {period === "month" ? "Este mês" : "Todo o período"}</button>} />
    <div className="kpi-grid">
      <article className="kpi-card"><span className="kpi-icon green"><Scissors /></span><div><small>Atendimentos concluídos</small><strong>{completed.length}</strong><p>Sem dados simulados</p></div></article>
      <article className="kpi-card"><span className="kpi-icon copper"><CircleDollarSign /></span><div><small>Faturamento realizado</small><strong>{formatCurrency(revenue)}</strong><p>Somente serviços concluídos</p></div></article>
      <article className="kpi-card"><span className="kpi-icon blue"><UsersRound /></span><div><small>Clientes novos</small><strong>{newClients}</strong><p>{clients.length} clientes cadastrados</p></div></article>
      <article className="kpi-card"><span className="kpi-icon amber"><UserRoundCheck /></span><div><small>Taxa de retorno</small><strong>{returnRate}%</strong><p>{recurringClients} clientes recorrentes</p></div></article>
    </div>
    <div className="reports-grid">
      <section className="content-card chart-card"><div className="section-heading compact"><div><p className="eyebrow">Movimento</p><h2>Atendimentos por dia</h2></div></div><div className="bar-chart" aria-label="Gráfico de atendimentos por dia">{byWeekday.map((day) => <div className="bar-column" key={day.label}><span>{day.count}</span><i style={{ height: `${(day.count / peak) * 100}%` }} /><small>{day.label}</small></div>)}</div></section>
      <section className="content-card"><div className="section-heading compact"><div><p className="eyebrow">Preferências</p><h2>Serviços mais realizados</h2></div></div>{serviceRanking.length ? <div className="ranking-list">{serviceRanking.slice(0, 4).map(({ service, count }, index) => <div key={service.id}><span className="rank-number">0{index + 1}</span><span><strong>{service.name}</strong><small>{count} atendimentos</small></span><i><b style={{ width: `${completed.length ? (count / completed.length) * 100 : 0}%` }} /></i></div>)}</div> : <p className="empty-copy">Nenhum serviço cadastrado.</p>}</section>
      <section className="content-card full-span"><div className="section-heading compact"><div><p className="eyebrow">Equipe</p><h2>Atendimentos por barbeiro</h2></div></div><div className="barber-performance">{barberRanking.map(({ barber, jobs }) => <div key={barber.id}><span className="performance-avatar" style={{ background: barber.color }}>{barber.name.slice(0, 1)}</span><span><strong>{barber.name}</strong><small>{jobs.length} atendimentos</small></span><div className="performance-track"><i style={{ width: `${(jobs.length / topBarberCount) * 100}%`, background: barber.color }} /></div><strong>{formatCurrency(jobs.reduce((sum, item) => sum + item.priceCents, 0))}</strong></div>)}</div></section>
    </div>
  </>;
}

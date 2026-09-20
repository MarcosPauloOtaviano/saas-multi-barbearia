"use client";

import { CalendarRange, CircleDollarSign, Scissors, TrendingUp, UserRoundCheck, UsersRound } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useDemo } from "@/components/demo-provider";
import { formatCurrency } from "@/lib/format";

const days = [{ label: "Seg", value: 58 }, { label: "Ter", value: 72 }, { label: "Qua", value: 64 }, { label: "Qui", value: 78 }, { label: "Sex", value: 100 }, { label: "Sáb", value: 88 }];

export function ReportsView() {
  const { appointments, clients, services, barbers } = useDemo();
  const completed = appointments.filter((item) => item.status === "completed");
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const estimate = appointments.filter((item) => item.date === todayIso && !["cancelled", "no_show"].includes(item.status)).reduce((sum, item) => sum + item.priceCents, 0);
  return <>
    <PageTitle eyebrow="Desempenho" title="Relatórios" description="Indicadores essenciais para decidir, sem transformar o app em um caixa." action={<button className="button subtle"><CalendarRange size={17} /> Este mês</button>} />
    <div className="kpi-grid">
      <article className="kpi-card"><span className="kpi-icon green"><Scissors /></span><div><small>Atendimentos</small><strong>184</strong><p><TrendingUp /> 12% vs. mês anterior</p></div></article>
      <article className="kpi-card"><span className="kpi-icon copper"><CircleDollarSign /></span><div><small>Faturamento estimado</small><strong>{formatCurrency(estimate * 22)}</strong><p><TrendingUp /> baseado em serviços realizados</p></div></article>
      <article className="kpi-card"><span className="kpi-icon blue"><UsersRound /></span><div><small>Clientes novos</small><strong>{clients.filter((client) => client.visits <= 1).length + 21}</strong><p>15% da base atendida</p></div></article>
      <article className="kpi-card"><span className="kpi-icon amber"><UserRoundCheck /></span><div><small>Taxa de retorno</small><strong>68%</strong><p>{completed.length + 123} recorrências no período</p></div></article>
    </div>
    <div className="reports-grid">
      <section className="content-card chart-card"><div className="section-heading compact"><div><p className="eyebrow">Movimento</p><h2>Atendimentos por dia</h2></div><span className="progress-label">sexta é o pico</span></div><div className="bar-chart" aria-label="Gráfico de atendimentos por dia">{days.map((day) => <div className="bar-column" key={day.label}><span>{Math.round(day.value / 8)}</span><i style={{ height: `${day.value}%` }} /><small>{day.label}</small></div>)}</div></section>
      <section className="content-card"><div className="section-heading compact"><div><p className="eyebrow">Preferências</p><h2>Serviços mais realizados</h2></div></div><div className="ranking-list">{services.filter((service) => service.active).slice(0, 4).map((service, index) => <div key={service.id}><span className="rank-number">0{index + 1}</span><span><strong>{service.name}</strong><small>{[74, 52, 38, 20][index]} atendimentos</small></span><i><b style={{ width: `${[100, 70, 51, 27][index]}%` }} /></i></div>)}</div></section>
      <section className="content-card full-span"><div className="section-heading compact"><div><p className="eyebrow">Equipe</p><h2>Atendimentos por barbeiro</h2></div></div><div className="barber-performance">{barbers.map((barber, index) => <div key={barber.id}><span className="performance-avatar" style={{ background: barber.color }}>{barber.name.slice(0, 1)}</span><span><strong>{barber.name}</strong><small>{[92, 68, 24][index]} atendimentos</small></span><div className="performance-track"><i style={{ width: `${[100, 74, 26][index]}%`, background: barber.color }} /></div><strong>{formatCurrency([489000, 351500, 118000][index])}</strong></div>)}</div></section>
    </div>
  </>;
}

"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleX, Clock3, Filter, Plus, Scissors, UserRound, X } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useDemo } from "@/components/demo-provider";
import { formatCurrency } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Aguardando", confirmed: "Confirmado", in_progress: "Em atendimento",
  completed: "Concluído", cancelled: "Cancelado", no_show: "Faltou",
};

export function AgendaView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appointments, clients, services, barbers, addAppointment, updateAppointmentStatus, rescheduleAppointment, role, currentBarberId } = useDemo();
  const [view, setView] = useState<"day" | "week">("day");
  const [barberFilter, setBarberFilter] = useState(currentBarberId ?? "all");
  const [modalOpen, setModalOpen] = useState(searchParams.get("novo") === "1");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [rescheduleFeedback, setRescheduleFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const selectedId = searchParams.get("appointment");
  const selected = appointments.find((item) => item.id === selectedId);
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const todayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
  const today = useMemo(() => appointments
    .filter((item) => item.date === todayIso && (barberFilter === "all" || item.barberId === barberFilter))
    .sort((a, b) => a.time.localeCompare(b.time)), [appointments, barberFilter, todayIso]);

  function closeDetail() { router.push("/agenda"); }

  async function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const service = services.find((item) => item.id === data.get("service"));
    const barber = barbers.find((item) => item.id === data.get("barber"));
    const client = clients.find((item) => item.id === data.get("client"));
    if (!service || !barber || !client) return;
    const result = await addAppointment({
      clientId: client.id, clientName: client.name,
      barberId: barber.id, barberName: barber.name,
      serviceId: service.id, serviceName: service.name,
      date: String(data.get("date")), time: String(data.get("time")),
      durationMinutes: service.durationMinutes, priceCents: service.priceCents,
    });
    setFeedback(result);
    if (result.ok) {
      event.currentTarget.reset();
      window.setTimeout(() => { setModalOpen(false); setFeedback(null); router.push("/agenda"); }, 900);
    }
  }

  async function submitReschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const result = await rescheduleAppointment(selected.id, String(data.get("date")), String(data.get("time")));
    setRescheduleFeedback(result);
  }

  return (
    <>
      <PageTitle eyebrow="Operação" title="Agenda" description="Horários, confirmações e encaixes em um só lugar." action={<button className="button primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Novo agendamento</button>} />

      <section className="toolbar-card">
        <div className="segmented" aria-label="Visualização da agenda">
          <button className={view === "day" ? "is-active" : ""} onClick={() => setView("day")}>Dia</button>
          <button className={view === "week" ? "is-active" : ""} onClick={() => setView("week")}>Semana</button>
        </div>
        <div className="date-switcher"><button aria-label="Dia anterior"><ChevronLeft /></button><span><CalendarDays size={17} /> {todayLabel}</span><button aria-label="Próximo dia"><ChevronRight /></button></div>
        {role !== "barber" && <label className="select-control"><Filter size={16} /><select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)} aria-label="Filtrar por barbeiro"><option value="all">Todos os barbeiros</option>{barbers.map((barber) => <option value={barber.id} key={barber.id}>{barber.name}</option>)}</select></label>}
      </section>

      {view === "day" ? (
        <section className="agenda-board">
          <div className="agenda-board__header"><span>{today.length} agendamentos</span><span><i className="legend-dot confirmed" /> Confirmado <i className="legend-dot pending" /> Aguardando</span></div>
          <div className="timeline">
            {today.map((item) => (
              <button className={`timeline-card status-${item.status}`} onClick={() => router.push(`/agenda?appointment=${item.id}`)} key={item.id}>
                <time>{item.time}</time>
                <span className="barber-stripe" style={{ background: barbers.find((barber) => barber.id === item.barberId)?.color }} />
                <span className="timeline-copy"><strong>{item.clientName}</strong><small><Scissors size={13} /> {item.serviceName} · {item.durationMinutes} min</small><small><UserRound size={13} /> {item.barberName}</small></span>
                <span className={`status-tag ${item.status}`}>{statusLabels[item.status]}</span>
                <span className="timeline-price">{formatCurrency(item.priceCents)}</span>
              </button>
            ))}
            <button className="free-slot" onClick={() => setModalOpen(true)}><time>16:30</time><span><Plus size={16} /> Horário livre · 45 min</span></button>
          </div>
        </section>
      ) : (
        <section className="week-board">
          {["Seg 14", "Ter 15", "Qua 16", "Qui 17", "Sex 18", "Sáb 19"].map((day, index) => (
            <div className={`week-day ${index === 5 ? "is-today" : ""}`} key={day}><strong>{day}</strong><span>{[6, 8, 7, 9, 10, today.length][index]} atendimentos</span><div className="week-bar"><i style={{ height: `${[46, 64, 54, 74, 86, 66][index]}%` }} /></div><small>{index === 5 ? "Hoje" : ""}</small></div>
          ))}
        </section>
      )}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="novo-agendamento-titulo">
            <div className="modal-header"><div><p className="eyebrow">Agenda</p><h2 id="novo-agendamento-titulo">Novo agendamento</h2></div><button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Fechar"><X /></button></div>
            <form className="form-grid" onSubmit={submitAppointment}>
              <label className="field full"><span>Cliente</span><select name="client" required defaultValue=""><option value="" disabled>Selecione o cliente</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
              <label className="field full"><span>Serviço</span><select name="service" required defaultValue=""><option value="" disabled>Selecione o serviço</option>{services.filter((service) => service.active).map((service) => <option value={service.id} key={service.id}>{service.name} · {service.durationMinutes} min · {formatCurrency(service.priceCents)}</option>)}</select></label>
              <label className="field full"><span>Barbeiro</span><select name="barber" required defaultValue={currentBarberId ?? ""}><option value="" disabled>Selecione o barbeiro</option>{barbers.filter((barber) => barber.active && (role !== "barber" || barber.id === currentBarberId)).map((barber) => <option value={barber.id} key={barber.id}>{barber.name}</option>)}</select></label>
              <label className="field"><span>Data</span><input name="date" type="date" defaultValue={todayIso} required /></label>
              <label className="field"><span>Horário</span><input name="time" type="time" defaultValue="16:30" required /></label>
              {feedback && <p className={`form-feedback full ${feedback.ok ? "success" : "error"}`}>{feedback.ok ? <Check size={17} /> : <CircleX size={17} />}{feedback.message}</p>}
              <div className="modal-actions full"><button type="button" className="button ghost" onClick={() => setModalOpen(false)}>Cancelar</button><button className="button primary" type="submit">Criar agendamento</button></div>
            </form>
          </section>
        </div>
      )}

      {selected && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetail(); }}>
          <aside className="detail-drawer" aria-label="Detalhes do agendamento">
            <div className="modal-header"><div><p className="eyebrow">Agendamento</p><h2>{selected.clientName}</h2></div><button className="icon-button" onClick={closeDetail} aria-label="Fechar"><X /></button></div>
            <span className={`status-tag large ${selected.status}`}>{statusLabels[selected.status]}</span>
            <dl className="detail-list"><div><dt>Data e horário</dt><dd>{new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${selected.date}T12:00:00Z`))}, {selected.time}</dd></div><div><dt>Serviço</dt><dd>{selected.serviceName} · {selected.durationMinutes} min</dd></div><div><dt>Barbeiro</dt><dd>{selected.barberName}</dd></div><div><dt>Valor estimado</dt><dd>{formatCurrency(selected.priceCents)}</dd></div><div><dt>Origem</dt><dd>{selected.source === "public_booking" ? "Agendamento público" : "Agenda interna"}</dd></div></dl>
            <div className="drawer-note"><Clock3 size={18} /><span><strong>Lembretes automáticos</strong><small>24 horas e 2 horas antes do atendimento</small></span></div>
            {!['cancelled','completed'].includes(selected.status) && <form className="reschedule-form" onSubmit={submitReschedule}><strong>Remarcar atendimento</strong><div className="form-grid"><label className="field"><span>Nova data</span><input name="date" type="date" defaultValue={selected.date} required /></label><label className="field"><span>Novo horário</span><input name="time" type="time" defaultValue={selected.time} required /></label></div>{rescheduleFeedback && <p className={`form-feedback ${rescheduleFeedback.ok ? "success" : "error"}`}>{rescheduleFeedback.message}</p>}<button className="button subtle" type="submit"><CalendarDays size={17} /> Remarcar</button></form>}
            <div className="drawer-actions">
              {selected.status === "pending" && <button className="button primary" onClick={() => updateAppointmentStatus(selected.id, "confirmed")}><Check size={17} /> Confirmar</button>}
              {selected.status === "confirmed" && <button className="button primary" onClick={() => updateAppointmentStatus(selected.id, "completed")}><Check size={17} /> Concluir atendimento</button>}
              {!['cancelled','completed'].includes(selected.status) && <button className="button danger" onClick={() => updateAppointmentStatus(selected.id, "cancelled")}><CircleX size={17} /> Cancelar</button>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

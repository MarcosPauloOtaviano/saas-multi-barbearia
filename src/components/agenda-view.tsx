"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleX, Clock3, Filter, MessageCircle, Plus, Repeat2, Scissors, UserRound, X } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useAppData } from "@/components/app-data-provider";
import { formatCurrency } from "@/lib/format";
import { useAdminBase } from "@/lib/admin-route";
import type { Appointment, AppointmentStatus } from "@/lib/types";

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Aguardando", confirmed: "Confirmado", in_progress: "Em atendimento",
  completed: "Concluído", cancelled: "Cancelado", no_show: "Faltou",
};
type WhatsappTemplate = "confirmacao" | "lembrete" | "imprevisto";

export function AgendaView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const base = useAdminBase();
  const { appointments, clients, services, barbers, addAppointment, addRecurringAppointments, updateAppointmentStatus, rescheduleAppointment, role, currentBarberId, shopName } = useAppData();
  const [view, setView] = useState<"day" | "week">("day");
  const [barberFilter, setBarberFilter] = useState(searchParams.get("barber") ?? currentBarberId ?? "all");
  const [modalOpen, setModalOpen] = useState(searchParams.get("novo") === "1");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [rescheduleFeedback, setRescheduleFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<WhatsappTemplate>("confirmacao");
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("7");
  const [recurrenceDuration, setRecurrenceDuration] = useState("3");
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>(() => {
    const day = new Date(`${todayIso}T12:00:00Z`).getUTCDay();
    return [day];
  });
  const [nowMs, setNowMs] = useState(0);
  const selectedId = searchParams.get("appointment");
  const selected = appointments.find((item) => item.id === selectedId);
  const selectedClient = selected ? clients.find((client) => client.id === selected.clientId) : undefined;
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [selectedDate, setSelectedDate] = useState(todayIso);
  function shiftDate(offset: number) { const date = new Date(`${selectedDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); setSelectedDate(date.toISOString().slice(0,10)); }
  const weekStart = new Date(`${selectedDate}T12:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - (weekStart.getUTCDay()+6)%7);
  const weekDates = Array.from({length:7},(_,i)=>{const date=new Date(weekStart);date.setUTCDate(date.getUTCDate()+i);return date.toISOString().slice(0,10);});
  const today = useMemo(() => appointments
    .filter((item) => item.date === selectedDate && (barberFilter === "all" || item.barberId === barberFilter))
    .sort((a, b) => a.time.localeCompare(b.time)), [appointments, barberFilter, selectedDate]);

  useEffect(() => {
    const refreshClock = () => setNowMs(Date.now());
    refreshClock();
    const timer = window.setInterval(refreshClock, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function appointmentHasEnded(appointment: Appointment) {
    if (!nowMs) return false;
    if (appointment.endsAt) return new Date(appointment.endsAt).getTime() <= nowMs;
    const startsAt = new Date(`${appointment.date}T${appointment.time}:00`).getTime();
    return startsAt + appointment.durationMinutes * 60_000 <= nowMs;
  }

  async function changeStatus(status: Appointment["status"]) {
    if (!selected) return;
    const result = await updateAppointmentStatus(selected.id, status);
    setStatusFeedback(result);
    if (result.ok) window.setTimeout(() => setStatusFeedback(null), 3_000);
  }

  function closeDetail() { router.push(`${base}/agenda`); }

  function whatsappMessage() {
    if (!selected) return "";
    const dateLabel = selected.date.split("-").reverse().join("/");
    const establishment = shopName || "barbearia";
    if (whatsappTemplate === "lembrete") return `Olá, ${selected.clientName}! Aqui é da ${establishment}. Lembrando do seu atendimento de ${selected.serviceName} com ${selected.barberName} no dia ${dateLabel} às ${selected.time}. Se precisar alterar, responda por aqui.`;
    if (whatsappTemplate === "imprevisto") return `Olá, ${selected.clientName}! Aqui é da ${establishment}. Precisamos falar sobre seu atendimento de ${selected.serviceName} no dia ${dateLabel} às ${selected.time}. Quando puder, responda por aqui.`;
    return `Olá, ${selected.clientName}! Aqui é da ${establishment}. Recebemos sua solicitação de ${selected.serviceName} para o dia ${dateLabel} às ${selected.time} com ${selected.barberName}. Posso confirmar esse horário?`;
  }

  async function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const selectedServiceIds = data.getAll("serviceIds").map(String);
    const selectedServices = services.filter((item) => selectedServiceIds.includes(item.id) && item.active);
    const barber = barbers.find((item) => item.id === data.get("barber"));
    const client = clients.find((item) => item.id === data.get("client"));
    if (!selectedServices.length || !barber || !client) return;
    const totalDuration = selectedServices.reduce((total, service) => total + service.durationMinutes, 0);
    const totalPrice = selectedServices.reduce((total, service) => total + service.priceCents, 0);
    const recurring = recurringEnabled;
    const intervalPreset = String(data.get("intervalPreset") ?? recurrenceInterval);
    const intervalDays = intervalPreset === "custom" ? Number(data.get("intervalDays")) : Number(intervalPreset);
    const durationMonths = Number(data.get("durationMonths") ?? recurrenceDuration) as 3 | 12 | 24;
    const weekdays = data.getAll("weekdays").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    if (recurring && (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 365)) {
      setFeedback({ ok: false, message: "Escolha um intervalo entre 1 e 365 dias." });
      return;
    }
    if (recurring && weekdays.length > 0 && intervalDays % 7 !== 0) {
      setFeedback({ ok: false, message: "Ao selecionar dias da semana, use um intervalo de 7, 14, 21 ou 28 dias." });
      return;
    }
    setBusy(true);
    try {
    const result = recurring
      ? await addRecurringAppointments({ clientId: client.id, barberId: barber.id, serviceIds: selectedServices.map((service) => service.id), firstDate: String(data.get("date")), time: String(data.get("time")), intervalDays, durationMonths, weekdays })
      : await addAppointment({
        clientId: client.id, clientName: client.name,
        barberId: barber.id, barberName: barber.name,
        serviceId: selectedServices[0].id, serviceIds: selectedServices.map((service) => service.id), serviceName: selectedServices.map((service) => service.name).join(" + "),
        date: String(data.get("date")), time: String(data.get("time")),
        durationMinutes: totalDuration, priceCents: totalPrice,
      });
    setFeedback(result);
    if (result.ok) {
      form.reset();
      setRecurringEnabled(false);
      setRecurrenceWeekdays([]);
      setRecurrenceInterval("7");
      setRecurrenceDuration("3");
      setSelectedDate(String(data.get("date")));
      window.setTimeout(() => { setModalOpen(false); setFeedback(null); router.push(`${base}/agenda`); }, 900);
    }
    } catch { setFeedback({ok:false,message:"A conexão falhou. Tente novamente."}); } finally { setBusy(false); }
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
        <div className="date-switcher"><button aria-label="Dia anterior" onClick={()=>shiftDate(view==="day"?-1:-7)}><ChevronLeft /></button><input aria-label="Data da agenda" type="date" value={selectedDate} onChange={e=>e.target.value&&setSelectedDate(e.target.value)} /><button aria-label="Próximo dia" onClick={()=>shiftDate(view==="day"?1:7)}><ChevronRight /></button></div>
        {role !== "barber" && <label className="select-control"><Filter size={16} /><select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)} aria-label="Filtrar por barbeiro"><option value="all">Todos os barbeiros</option>{barbers.map((barber) => <option value={barber.id} key={barber.id}>{barber.name}</option>)}</select></label>}
      </section>

      {view === "day" ? (
        <section className="agenda-board">
          <div className="agenda-board__header"><span>{today.length} agendamentos</span><span><i className="legend-dot confirmed" /> Confirmado <i className="legend-dot pending" /> Aguardando</span></div>
          <div className="timeline">
            {today.map((item) => (
              <button className={`timeline-card status-${item.status}`} onClick={() => router.push(`${base}/agenda?appointment=${item.id}`)} key={item.id}>
                <time>{item.time}</time>
                <span className="barber-stripe" style={{ background: barbers.find((barber) => barber.id === item.barberId)?.color }} />
                <span className="timeline-copy"><strong>{item.clientName}</strong><small><Scissors size={13} /> {item.serviceName} · {item.durationMinutes} min</small><small><UserRound size={13} /> {item.barberName}</small></span>
                <span className={`status-tag ${item.status}`}>{statusLabels[item.status]}</span>
                <span className="timeline-price">{formatCurrency(item.priceCents)}</span>
              </button>
            ))}
            {!today.length && <p className="table-hint">Nenhum agendamento nesta data.</p>}
          </div>
        </section>
      ) : (
        <section className="week-board">
          {weekDates.map(day => <button className={`week-day ${day===todayIso?"is-today":""}`} key={day} onClick={()=>{setSelectedDate(day);setView("day");}}><strong>{new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${day}T12:00:00Z`))}</strong><span>{appointments.filter(a=>a.date===day&&a.status!=="cancelled"&&(barberFilter==="all"||a.barberId===barberFilter)).length} atendimentos</span><small>{day===todayIso?"Hoje":"Ver dia"}</small></button>)}
        </section>
      )}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="novo-agendamento-titulo">
            <div className="modal-header"><div><p className="eyebrow">Agenda</p><h2 id="novo-agendamento-titulo">Novo agendamento</h2></div><button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Fechar"><X /></button></div>
            <form className="form-grid" onSubmit={submitAppointment}>
              <label className="field full"><span>Cliente</span><select name="client" required defaultValue={searchParams.get("cliente") ?? ""}><option value="" disabled>Selecione o cliente</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
              <label className="field full"><span>Serviços <small>(selecione um ou mais)</small></span><select name="serviceIds" required multiple size={Math.min(5, Math.max(3, services.filter((service) => service.active).length))}>{services.filter((service) => service.active).map((service) => <option value={service.id} key={service.id}>{service.name} · {service.durationMinutes} min · {formatCurrency(service.priceCents)}</option>)}</select></label>
              <label className="field full"><span>Barbeiro</span><select name="barber" required defaultValue={currentBarberId ?? ""}><option value="" disabled>Selecione o barbeiro</option>{barbers.filter((barber) => barber.active && (role !== "barber" || barber.id === currentBarberId)).map((barber) => <option value={barber.id} key={barber.id}>{barber.name}</option>)}</select></label>
              <label className="field"><span>Data</span><input name="date" type="date" defaultValue={selectedDate} min={todayIso} required /></label>
              <label className="field"><span>Horário</span><input name="time" type="time" required /></label>
              <label className="recurrence-toggle full"><input type="checkbox" checked={recurringEnabled} onChange={(event) => setRecurringEnabled(event.target.checked)} /><span><strong><Repeat2 size={16} /> Criar agendamento recorrente</strong><small>Reserve esse mesmo horário para o cliente por vários meses.</small></span></label>
              {recurringEnabled && <div className="recurrence-panel full">
                <div className="recurrence-panel__heading"><div><strong>Agenda fixa</strong><small>Você pode revisar e cancelar cada horário depois, na agenda.</small></div><span>{recurrenceDuration} meses</span></div>
                <div className="form-grid">
                  <label className="field"><span>Repetir a cada</span><select name="intervalPreset" value={recurrenceInterval} onChange={(event) => setRecurrenceInterval(event.target.value)}><option value="7">7 dias (semanal)</option><option value="14">14 dias (quinzenal)</option><option value="21">21 dias</option><option value="28">28 dias</option><option value="15">15 dias</option><option value="30">30 dias</option><option value="custom">Outro intervalo…</option></select></label>
                  {recurrenceInterval === "custom" ? <label className="field"><span>Quantidade de dias</span><input name="intervalDays" type="number" min="1" max="365" defaultValue="7" required /></label> : <span />}
                  <label className="field"><span>Por quanto tempo</span><select name="durationMonths" value={recurrenceDuration} onChange={(event) => setRecurrenceDuration(event.target.value)}><option value="3">3 meses</option><option value="12">12 meses</option><option value="24">24 meses</option></select></label>
                </div>
                <fieldset className="recurrence-days"><legend>Dias da semana <small>(opcional)</small></legend><div>{[[0,"Dom"],[1,"Seg"],[2,"Ter"],[3,"Qua"],[4,"Qui"],[5,"Sex"],[6,"Sáb"]].map(([value,label]) => <label key={String(value)}><input name="weekdays" type="checkbox" value={String(value)} checked={recurrenceWeekdays.includes(Number(value))} onChange={(event) => setRecurrenceWeekdays((current) => event.target.checked ? [...new Set([...current, Number(value)])] : current.filter((day) => day !== Number(value)))} /><span>{label}</span></label>)}</div></fieldset>
                <p className="recurrence-hint">{recurrenceWeekdays.length ? "Os dias marcados serão repetidos na cadência escolhida." : "Sem dias marcados, o sistema repete exatamente a cada intervalo escolhido."}</p>
              </div>}
              {feedback && <p className={`form-feedback full ${feedback.ok ? "success" : "error"}`}>{feedback.ok ? <Check size={17} /> : <CircleX size={17} />}{feedback.message}</p>}
              <div className="modal-actions full"><button type="button" className="button ghost" onClick={() => setModalOpen(false)}>Cancelar</button><button className="button primary" type="submit" disabled={busy}>{busy?"Salvando…":"Criar agendamento"}</button></div>
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
            {!['cancelled','completed','no_show'].includes(selected.status) && !appointmentHasEnded(selected) && <form className="reschedule-form" onSubmit={submitReschedule}><strong>Remarcar atendimento</strong><div className="form-grid"><label className="field"><span>Nova data</span><input name="date" type="date" defaultValue={selected.date} required /></label><label className="field"><span>Novo horário</span><input name="time" type="time" defaultValue={selected.time} required /></label></div>{rescheduleFeedback && <p className={`form-feedback ${rescheduleFeedback.ok ? "success" : "error"}`}>{rescheduleFeedback.message}</p>}<button className="button subtle" type="submit"><CalendarDays size={17} /> Remarcar</button></form>}
            {selected.status !== "completed" && selected.status !== "no_show" && selected.status !== "cancelled" && !appointmentHasEnded(selected) && <p className="drawer-hint">A conclusão fica disponível depois do horário final do atendimento.</p>}
            {selected.status !== "no_show" && selected.status !== "cancelled" && appointmentHasEnded(selected) && <p className="drawer-hint">O sistema conclui este atendimento automaticamente. Se o cliente não compareceu, registre isso abaixo para manter o relatório correto.</p>}
            {statusFeedback && <p className={`form-feedback ${statusFeedback.ok ? "success" : "error"}`} role="status">{statusFeedback.message}</p>}
            {selectedClient?.phone && <div className="drawer-whatsapp-box"><div className="drawer-whatsapp-heading"><MessageCircle size={18} /><span><strong>Mensagem rápida</strong><small>Abre o WhatsApp com um texto pronto</small></span></div><label className="field"><span>Escolha o aviso</span><select value={whatsappTemplate} onChange={(event) => setWhatsappTemplate(event.target.value as WhatsappTemplate)}><option value="confirmacao">Confirmar horário</option><option value="lembrete">Lembrar atendimento</option><option value="imprevisto">Avisar imprevisto</option></select></label><a className="button subtle drawer-whatsapp" href={`https://wa.me/${(selectedClient.phone.replace(/\D/g, "").startsWith("55") ? selectedClient.phone.replace(/\D/g, "") : `55${selectedClient.phone.replace(/\D/g, "")}`)}?text=${encodeURIComponent(whatsappMessage())}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Abrir WhatsApp</a></div>}
            <div className="drawer-actions">
              {selected.status === "pending" && <button className="button primary" onClick={() => void changeStatus("confirmed")}><Check size={17} /> Confirmar</button>}
              {appointmentHasEnded(selected) && ["pending", "confirmed", "in_progress"].includes(selected.status) && <button className="button primary" onClick={() => void changeStatus("completed")}><Check size={17} /> Concluir atendimento</button>}
              {appointmentHasEnded(selected) && ["pending", "confirmed", "in_progress", "completed"].includes(selected.status) && <button className="button danger" onClick={() => void changeStatus("no_show")}><CircleX size={17} /> Atendimento não realizado</button>}
              {!['cancelled','completed','no_show'].includes(selected.status) && !appointmentHasEnded(selected) && <button className="button danger" onClick={() => void changeStatus("cancelled")}><CircleX size={17} /> Cancelar</button>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

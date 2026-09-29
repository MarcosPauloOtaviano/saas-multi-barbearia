"use client";
import { useMemo, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { PageTitle } from "@/components/app-shell";
import type { ScheduleDay } from "@/lib/types";

export const weekdays = [{ value: 1, label: "Segunda" }, { value: 2, label: "Terça" }, { value: 3, label: "Quarta" }, { value: 4, label: "Quinta" }, { value: 5, label: "Sexta" }, { value: 6, label: "Sábado" }, { value: 0, label: "Domingo" }];
export function completeWeek(days: ScheduleDay[]): ScheduleDay[] {
  return weekdays.map(day => days.find(item => item.weekday === day.value) ?? { weekday: day.value, active: false, startsAt: "09:00", endsAt: "18:00", breakStart: null, breakEnd: null });
}
export function ScheduleFields({ days, onChange, showBreak = false }: { days: ScheduleDay[]; onChange: (days: ScheduleDay[]) => void; showBreak?: boolean }) {
  function update(weekday: number, changes: Partial<ScheduleDay>) { onChange(days.map(day => day.weekday === weekday ? { ...day, ...changes } : day)); }
  const activeDays = useMemo(() => days.filter(day => day.active), [days]);
  const configuredBreak = activeDays.find(day => day.breakStart && day.breakEnd);
  function applyBreakToOpenDays(start: string, end: string) {
    onChange(days.map(day => day.active ? { ...day, breakStart: start, breakEnd: end } : { ...day, breakStart: null, breakEnd: null }));
  }
  function clearBreakFromOpenDays() {
    onChange(days.map(day => ({ ...day, breakStart: null, breakEnd: null })));
  }
  return <div className="operating-days">{days.map(day => {
    const name = weekdays.find(d => d.value === day.weekday)?.label;
    return <div className={`operating-day ${!day.active ? "closed" : ""}`} key={day.weekday}>
      <label className="day-checkbox"><input type="checkbox" checked={day.active} onChange={e => update(day.weekday, { active: e.target.checked })} /><strong>{name}</strong><small>{day.active ? "Aberto" : "Fechado / folga"}</small></label>
      {day.active && <div className="day-times"><label><span>Das</span><input type="time" value={day.startsAt} required aria-label={`Início ${name}`} onChange={e => update(day.weekday, { startsAt: e.target.value })} /></label><label><span>Até</span><input type="time" value={day.endsAt} required aria-label={`Fim ${name}`} onChange={e => update(day.weekday, { endsAt: e.target.value })} /></label></div>}
      {day.active && showBreak && <div className="break-settings"><label className="break-toggle"><input type="checkbox" checked={Boolean(day.breakStart && day.breakEnd)} onChange={e => update(day.weekday, e.target.checked ? { breakStart: "12:00", breakEnd: "13:00" } : { breakStart: null, breakEnd: null })} /><span><strong>Pausa para almoço</strong><small>Bloqueia novos horários neste intervalo.</small></span></label>{day.breakStart && day.breakEnd && <div className="day-times break-times"><label><span>Das</span><input type="time" value={day.breakStart} required aria-label={`Início da pausa ${name}`} onChange={e => update(day.weekday, { breakStart: e.target.value })} /></label><label><span>Até</span><input type="time" value={day.breakEnd} required aria-label={`Fim da pausa ${name}`} onChange={e => update(day.weekday, { breakEnd: e.target.value })} /></label></div>}</div>}
    </div>;
  })}{showBreak && activeDays.length > 0 && <div className="break-bulk-actions" aria-label="Aplicar pausa em vários dias"><div><strong>Repetir pausa nos dias abertos</strong><small>{configuredBreak ? `Usar ${configuredBreak.breakStart} às ${configuredBreak.breakEnd} em todos os dias abertos.` : "Define uma pausa de 12:00 às 13:00 em todos os dias abertos."}</small></div><div><button type="button" className="button subtle" onClick={() => applyBreakToOpenDays(configuredBreak?.breakStart ?? "12:00", configuredBreak?.breakEnd ?? "13:00")}>Aplicar a todos</button><button type="button" className="button subtle" onClick={clearBreakFromOpenDays}>Limpar pausas</button></div></div>}</div>;
}
export function HoursView() {
  const { shopHours, bookingPaused, barbers, workingHours, saveShopSchedule, saveBarberSchedule } = useAppData();
  const [target, setTarget] = useState("shop");
  const [days, setDays] = useState(() => completeWeek(shopHours));
  const [paused, setPaused] = useState(bookingPaused);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ok:boolean;message:string} | null>(null);
  function select(value: string) {
    setTarget(value); setFeedback(null);
    setDays(completeWeek(value === "shop" ? shopHours : workingHours.filter(d => d.barberId === value)));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    if (days.some(d => d.active && (d.startsAt >= d.endsAt || (d.breakStart && !d.breakEnd) || (!d.breakStart && d.breakEnd) || (d.breakStart && d.breakEnd && (d.breakStart <= d.startsAt || d.breakEnd >= d.endsAt || d.breakStart >= d.breakEnd))))) { setFeedback({ok:false,message:"Confira abertura, fechamento e a pausa para almoço. A pausa precisa ficar dentro do horário de trabalho."}); return; }
    const normalizedDays = days.map(day => day.active ? day : { ...day, breakStart: null, breakEnd: null });
    setBusy(true);
    try { setFeedback(target === "shop" ? await saveShopSchedule(normalizedDays, paused) : await saveBarberSchedule(target, normalizedDays)); }
    catch { setFeedback({ok:false,message:"A conexão falhou. Tente novamente."}); }
    finally { setBusy(false); }
  }
  return <><PageTitle eyebrow="Agenda" title="Funcionamento" description="Marque os dias abertos e ajuste os horários de cada profissional." />
    <section className="content-card operating-card"><label className="field"><span>Editar horários de</span><select value={target} disabled={busy} onChange={e => select(e.target.value)}><option value="shop">Barbearia — abertura da loja</option>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <form onSubmit={save}><fieldset disabled={busy} className="plain-fieldset">
        {target === "shop" && <label className="pause-booking"><input type="checkbox" checked={paused} onChange={e => setPaused(e.target.checked)} /><span><strong>Pausar novos agendamentos</strong><small>Os horários já marcados são mantidos.</small></span></label>}
        <ScheduleFields days={days} onChange={setDays} showBreak={target !== "shop"} />
        <p className="table-hint">O cliente só pode reservar quando a loja e o profissional estiverem disponíveis. A pausa para almoço bloqueia novos horários e não cancela o que já foi marcado.</p>
        {feedback && <p role="status" className={`form-feedback ${feedback.ok ? "success" : "error"}`}>{feedback.message}</p>}
        <button className="button primary" disabled={busy}>{busy ? "Salvando…" : "Salvar horários"}</button>
      </fieldset></form>
    </section></>;
}

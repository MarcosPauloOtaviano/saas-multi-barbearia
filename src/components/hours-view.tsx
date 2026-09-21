"use client";
import { useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { PageTitle } from "@/components/app-shell";
import type { ScheduleDay } from "@/lib/types";

export const weekdays = [{ value: 1, label: "Segunda" }, { value: 2, label: "Terça" }, { value: 3, label: "Quarta" }, { value: 4, label: "Quinta" }, { value: 5, label: "Sexta" }, { value: 6, label: "Sábado" }, { value: 0, label: "Domingo" }];
export function completeWeek(days: ScheduleDay[]): ScheduleDay[] {
  return weekdays.map(day => days.find(item => item.weekday === day.value) ?? { weekday: day.value, active: false, startsAt: "09:00", endsAt: "18:00" });
}
export function ScheduleFields({ days, onChange }: { days: ScheduleDay[]; onChange: (days: ScheduleDay[]) => void }) {
  function update(weekday: number, changes: Partial<ScheduleDay>) { onChange(days.map(day => day.weekday === weekday ? { ...day, ...changes } : day)); }
  return <div className="operating-days">{days.map(day => {
    const name = weekdays.find(d => d.value === day.weekday)?.label;
    return <div className={`operating-day ${!day.active ? "closed" : ""}`} key={day.weekday}>
      <label className="day-checkbox"><input type="checkbox" checked={day.active} onChange={e => update(day.weekday, { active: e.target.checked })} /><strong>{name}</strong><small>{day.active ? "Aberto" : "Fechado / folga"}</small></label>
      {day.active && <div className="day-times"><label><span>Das</span><input type="time" value={day.startsAt} required aria-label={`Início ${name}`} onChange={e => update(day.weekday, { startsAt: e.target.value })} /></label><label><span>Até</span><input type="time" value={day.endsAt} required aria-label={`Fim ${name}`} onChange={e => update(day.weekday, { endsAt: e.target.value })} /></label></div>}
    </div>;
  })}</div>;
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
    if (days.some(d => d.active && d.startsAt >= d.endsAt)) { setFeedback({ok:false,message:"O fechamento deve ser depois da abertura."}); return; }
    setBusy(true);
    try { setFeedback(target === "shop" ? await saveShopSchedule(days, paused) : await saveBarberSchedule(target, days)); }
    catch { setFeedback({ok:false,message:"A conexão falhou. Tente novamente."}); }
    finally { setBusy(false); }
  }
  return <><PageTitle eyebrow="Agenda" title="Funcionamento" description="Marque os dias abertos e ajuste os horários de cada profissional." />
    <section className="content-card operating-card"><label className="field"><span>Editar horários de</span><select value={target} disabled={busy} onChange={e => select(e.target.value)}><option value="shop">Barbearia — abertura da loja</option>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <form onSubmit={save}><fieldset disabled={busy} className="plain-fieldset">
        {target === "shop" && <label className="pause-booking"><input type="checkbox" checked={paused} onChange={e => setPaused(e.target.checked)} /><span><strong>Pausar novos agendamentos</strong><small>Os horários já marcados são mantidos.</small></span></label>}
        <ScheduleFields days={days} onChange={setDays} />
        <p className="table-hint">O cliente só pode reservar quando a loja e o profissional estiverem disponíveis. Mudanças não cancelam horários já marcados.</p>
        {feedback && <p role="status" className={`form-feedback ${feedback.ok ? "success" : "error"}`}>{feedback.message}</p>}
        <button className="button primary" disabled={busy}>{busy ? "Salvando…" : "Salvar horários"}</button>
      </fieldset></form>
    </section></>;
}

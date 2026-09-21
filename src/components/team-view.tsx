"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CalendarClock, Camera, CheckCircle2, Clock3, LockKeyhole, MailCheck, MoreHorizontal, Plus, ShieldCheck, X } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { BarberAvatar } from "@/components/barber-avatar";
import { useAppData } from "@/components/app-data-provider";
import { useAdminBase } from "@/lib/admin-route";
import type { MemberRole, WorkingHour } from "@/lib/types";

const roleLabels: Record<MemberRole, string> = { owner: "Proprietário", manager: "Gerente", barber: "Barbeiro", receptionist: "Recepcionista" };
const weekdays = [
  { value: 1, label: "Segunda" }, { value: 2, label: "Terça" }, { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" }, { value: 5, label: "Sexta" }, { value: 6, label: "Sábado" }, { value: 0, label: "Domingo" },
];

function defaultSchedule(barberId: string, current: WorkingHour[]) {
  return weekdays.map(({ value }) => current.find((item) => item.barberId === barberId && item.weekday === value) ?? { barberId, weekday: value, startsAt: "09:00", endsAt: "18:00", active: value !== 0 });
}

function shiftFor(schedule: WorkingHour[], weekday: number) {
  const item = schedule.find((entry) => entry.weekday === weekday && entry.active);
  return item ? `${item.startsAt}–${item.endsAt}` : "Folga";
}

export function TeamView() {
  const { barbers, teamMembers, workingHours, inviteTeamMember, updateBarberAvatar, saveBarberSchedule, canManage, role } = useAppData();
  const base = useAdminBase();
  const [open, setOpen] = useState(false);
  const [scheduleBarberId, setScheduleBarberId] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<WorkingHour[]>([]);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [scheduleFeedback, setScheduleFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState("");

  function openSchedule(barberId: string) {
    setScheduleBarberId(barberId);
    setScheduleDraft(defaultSchedule(barberId, workingHours));
    setScheduleFeedback(null);
  }

  function updateDay(weekday: number, changes: Partial<WorkingHour>) {
    setScheduleDraft((current) => current.map((item) => item.weekday === weekday ? { ...item, ...changes } : item));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true); setFeedback(null);
    const result = await inviteTeamMember({ name: String(data.get("name")).trim(), email: String(data.get("email")).trim(), role: String(data.get("role")) as MemberRole, color: String(data.get("color")) });
    setSubmitting(false); setFeedback(result);
    if (result.ok) form.reset();
  }

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scheduleBarberId) return;
    setScheduleSubmitting(true);
    const result = await saveBarberSchedule(scheduleBarberId, scheduleDraft);
    setScheduleFeedback(result); setScheduleSubmitting(false);
    if (result.ok) window.setTimeout(() => { setScheduleBarberId(null); setScheduleFeedback(null); }, 900);
  }

  async function changeAvatar(barberId: string, file?: File) {
    if (!file) return;
    setAvatarBusy(barberId); setFeedback(null);
    const result = await updateBarberAvatar(barberId, file);
    setFeedback(result); setAvatarBusy("");
  }

  if (!canManage) return <section className="content-card access-card"><LockKeyhole /><div><p className="eyebrow">Acesso protegido</p><h1>Equipe e permissões</h1><p>Seu perfil de {roleLabels[role].toLowerCase()} acessa apenas a própria agenda. Convites e permissões ficam com o proprietário ou gerente.</p></div></section>;

  return <>
    <PageTitle eyebrow="Operação" title="Equipe" description="Convide pessoas, ajuste permissões e organize a disponibilidade de cada profissional." action={<button className="button primary" onClick={() => setOpen(true)}><Plus size={18} /> Convidar pessoa</button>} />
    {feedback && <p className={`form-feedback ${feedback.ok ? "success" : "error"}`}>{feedback.message}</p>}

    <section className="content-card team-access-list" aria-labelledby="acessos-equipe">
      <div className="section-heading compact"><div><p className="eyebrow">Acessos</p><h2 id="acessos-equipe">Usuários da barbearia</h2></div><span className="count-badge">{teamMembers.length}</span></div>
      {teamMembers.map((member) => <div className="team-access-row" key={member.id}>
        <BarberAvatar barber={barbers.find((barber) => barber.id === member.barberId) ?? { name: member.name, color: member.color ?? "#183c36" }} className="team-avatar" />
        <span className="team-access-person"><strong>{member.name}</strong><small>{member.email}</small></span>
        <span className="role-chip">{roleLabels[member.role]}</span>
        <span className={`invite-state ${member.status}`}>{member.status === "active" ? <><CheckCircle2 /> Ativo</> : member.status === "invited" ? <><MailCheck /> Convite enviado</> : <><LockKeyhole /> Suspenso</>}</span>
        <button className="icon-button" aria-label={`Opções de ${member.name}`}><MoreHorizontal /></button>
      </div>)}
    </section>

    <div className="team-grid">
      {barbers.map((barber) => <article className="team-card" key={barber.id}>
        <div className="team-card__head"><label className={`avatar-upload-control ${avatarBusy === barber.id ? "is-busy" : ""}`}><BarberAvatar barber={barber} className="team-avatar" /><input type="file" accept="image/jpeg,image/png,image/webp" disabled={avatarBusy === barber.id} aria-label={`Adicionar foto de ${barber.name}`} onChange={(event) => { const input = event.currentTarget; void changeAvatar(barber.id, input.files?.[0]).finally(() => { input.value = ""; }); }} /><span><Camera /></span></label><div><h2>{barber.name}</h2><p>{barber.role}</p></div><button className="icon-button" aria-label={`Opções de ${barber.name}`}><MoreHorizontal /></button></div>
        <div className="team-stats"><span><strong>{barber.todayCount}</strong><small>hoje</small></span><span><Clock3 size={17} /><small>{shiftFor(defaultSchedule(barber.id, workingHours), 1)} seg</small></span></div>
        <div className="team-card__footer"><span className="active-label"><CheckCircle2 /> Ativo</span><Link href={`${base}/agenda?barber=${barber.id}`}>Ver agenda</Link></div>
      </article>)}
    </div>

    <section className="content-card permission-card"><div><span className="permission-icon"><ShieldCheck /></span><div><p className="eyebrow">Permissões</p><h2>Cada função vê somente o necessário</h2><p>Barbeiro vê a própria agenda; recepção opera os horários; gerente cuida da operação; proprietário controla tudo.</p></div></div><div className="role-pills"><span>Proprietário</span><span>Gerente</span><span>Barbeiro</span><span>Recepcionista</span></div></section>
    <section className="content-card"><div className="section-heading compact"><div><p className="eyebrow">Disponibilidade</p><h2>Horários de trabalho</h2></div><button className="button subtle" onClick={() => barbers[0] && openSchedule(barbers[0].id)} disabled={!barbers.length}><CalendarClock size={17} /> Ajustar horários</button></div><div className="availability-table"><div className="availability-row head"><span>Profissional</span><span>Seg–Sex</span><span>Sábado</span><span>Domingo</span></div>{barbers.map((barber) => { const schedule = defaultSchedule(barber.id, workingHours); return <button className="availability-row availability-row--button" key={barber.id} onClick={() => openSchedule(barber.id)}><strong>{barber.name}</strong><span>{shiftFor(schedule, 1)}</span><span>{shiftFor(schedule, 6)}</span><span>{shiftFor(schedule, 0)}</span></button>; })}</div><p className="table-hint">Clique em um profissional para editar os dias, horários e folgas.</p></section>

    {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="nova-pessoa"><div className="modal-header"><div><p className="eyebrow">Acesso individual</p><h2 id="nova-pessoa">Convidar para a equipe</h2><p className="modal-intro">A pessoa recebe um link seguro por e-mail. Nenhuma senha é criada ou compartilhada.</p></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button></div><form className="form-grid" onSubmit={submit}><label className="field full"><span>Nome completo</span><input name="name" required minLength={2} autoComplete="name" /></label><label className="field full"><span>E-mail de acesso</span><input name="email" type="email" required autoComplete="email" /></label><label className="field"><span>Função</span><select name="role" defaultValue="barber"><option value="barber">Barbeiro</option><option value="receptionist">Recepcionista</option>{role === "owner" && <option value="manager">Gerente</option>}</select></label><label className="field"><span>Cor da agenda</span><div className="color-control"><input name="color" type="color" defaultValue="#356f68" /></div></label><div className="invite-security full"><ShieldCheck /><span><strong>Acesso com menor privilégio</strong><small>O convite ativa somente a função escolhida neste estabelecimento.</small></span></div>{feedback && <p className={`form-feedback ${feedback.ok ? "success" : "error"} full`}>{feedback.message}</p>}<div className="modal-actions full"><button type="button" className="button ghost" onClick={() => setOpen(false)}>Fechar</button><button className="button primary" disabled={submitting}>{submitting ? "Enviando…" : "Enviar convite"}</button></div></form></section></div>}

    {scheduleBarberId && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScheduleBarberId(null); }}><section className="modal-card schedule-modal" role="dialog" aria-modal="true" aria-labelledby="horarios-profissional"><div className="modal-header"><div><p className="eyebrow">Disponibilidade individual</p><h2 id="horarios-profissional">Horários de {barbers.find((barber) => barber.id === scheduleBarberId)?.name}</h2><p className="modal-intro">Esses horários definem quando os clientes conseguem reservar este profissional.</p></div><button className="icon-button" onClick={() => setScheduleBarberId(null)} aria-label="Fechar"><X /></button></div><form onSubmit={submitSchedule} className="schedule-form">{scheduleDraft.map((item) => <div className="schedule-day-row" key={item.weekday}><label><input type="checkbox" checked={item.active} onChange={(event) => updateDay(item.weekday, { active: event.target.checked })} /><strong>{weekdays.find((day) => day.value === item.weekday)?.label}</strong></label><input type="time" value={item.startsAt} disabled={!item.active} onChange={(event) => updateDay(item.weekday, { startsAt: event.target.value })} aria-label={`Início ${weekdays.find((day) => day.value === item.weekday)?.label}`} /><span>até</span><input type="time" value={item.endsAt} disabled={!item.active} onChange={(event) => updateDay(item.weekday, { endsAt: event.target.value })} aria-label={`Fim ${weekdays.find((day) => day.value === item.weekday)?.label}`} /></div>)}{scheduleFeedback && <p className={`form-feedback ${scheduleFeedback.ok ? "success" : "error"}`}>{scheduleFeedback.message}</p>}<div className="modal-actions"><button type="button" className="button ghost" onClick={() => setScheduleBarberId(null)}>Cancelar</button><button className="button primary" disabled={scheduleSubmitting}>{scheduleSubmitting ? "Salvando…" : "Salvar horários"}</button></div></form></section></div>}
  </>;
}

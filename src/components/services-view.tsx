"use client";

import { FormEvent, useState } from "react";
import { Clock3, MoreHorizontal, Plus, Scissors, X } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useAppData } from "@/components/app-data-provider";
import { formatCurrency } from "@/lib/format";

export function ServicesView() {
  const { services, toggleService, addService } = useAppData();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    const result = await addService({ name: String(data.get("name")).trim(), description: String(data.get("description")).trim(), durationMinutes: Number(data.get("duration")), priceCents: Math.round(Number(data.get("price")) * 100) });
    setFeedback(result);
    setSubmitting(false);
    if (result.ok) { form.reset(); window.setTimeout(() => { setOpen(false); setFeedback(null); }, 900); }
  }
  return <>
    <PageTitle eyebrow="Catálogo" title="Serviços" description="Duração e preço usados na agenda e nos relatórios." action={<button className="button primary" onClick={() => setOpen(true)}><Plus size={18} /> Novo serviço</button>} />
    <div className="services-grid">
      {services.map((service) => <article className={`service-card ${!service.active ? "is-inactive" : ""}`} key={service.id}>
        <div className="service-card__head"><span className="service-icon"><Scissors /></span><button className="icon-button"><MoreHorizontal /></button></div>
        <h2>{service.name}</h2><p>{service.description}</p>
        <div className="service-meta"><span><Clock3 size={16} /> {service.durationMinutes} min</span><strong>{formatCurrency(service.priceCents)}</strong></div>
        <label className="switch-row"><span>{service.active ? "Disponível para agendamento" : "Serviço inativo"}</span><input type="checkbox" checked={service.active} onChange={() => toggleService(service.id)} /><i /></label>
      </article>)}
    </div>
    <section className="info-strip"><span><Scissors /></span><div><strong>Preços históricos preservados</strong><p>Quando um serviço é alterado, agendamentos antigos mantêm nome, duração e valor originais.</p></div></section>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="novo-servico"><div className="modal-header"><div><p className="eyebrow">Catálogo</p><h2 id="novo-servico">Novo serviço</h2></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button></div><form className="form-grid" onSubmit={submit}><label className="field full"><span>Nome</span><input name="name" required minLength={2} /></label><label className="field full"><span>Descrição</span><textarea name="description" rows={3} required /></label><label className="field"><span>Duração (min)</span><input name="duration" type="number" min="10" step="5" defaultValue="45" required /></label><label className="field"><span>Preço (R$)</span><input name="price" type="number" min="0" step="0.01" defaultValue="45.00" required /></label>{feedback && <p className={`form-feedback ${feedback.ok ? "success" : "error"} full`}>{feedback.message}</p>}<div className="modal-actions full"><button type="button" className="button ghost" onClick={() => setOpen(false)}>Cancelar</button><button className="button primary" disabled={submitting}>{submitting ? "Cadastrando…" : "Cadastrar serviço"}</button></div></form></section></div>}
  </>;
}

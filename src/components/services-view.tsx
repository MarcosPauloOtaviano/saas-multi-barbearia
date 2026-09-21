"use client";

import { FormEvent, useState } from "react";
import { Clock3, MoreHorizontal, Plus, Scissors, X } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useAppData } from "@/components/app-data-provider";
import { formatCurrency } from "@/lib/format";
import type { Service } from "@/lib/types";

export function ServicesView() {
  const { services, toggleService, addService, updateService } = useAppData();
  const [editing, setEditing] = useState<Omit<Service, "active"> | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    const payload = { name: String(data.get("name")).trim(), description: String(data.get("description")).trim(), durationMinutes: Number(data.get("duration")), priceCents: Math.round(Number(data.get("price")) * 100) };
    const result = editing ? await updateService({ ...editing, ...payload }) : await addService(payload);
    setFeedback(result);
    setSubmitting(false);
    if (result.ok) { form.reset(); window.setTimeout(() => { setEditing(null); setFeedback(null); }, 900); }
  }
  return <>
    <PageTitle eyebrow="Catálogo" title="Serviços" description="Duração e preço usados na agenda e nos relatórios." action={<button className="button primary" onClick={() => { setFeedback(null); setEditing({ id: "", name: "", description: "", durationMinutes: 45, priceCents: 4500 }); }}><Plus size={18} /> Novo serviço</button>} />
    {services.length ? <div className="services-grid">
      {services.map((service) => <article className={`service-card ${!service.active ? "is-inactive" : ""}`} key={service.id}>
        <div className="service-card__head"><span className="service-icon"><Scissors /></span><button className="icon-button" onClick={() => { setFeedback(null); setEditing(service); }} aria-label={`Editar ${service.name}`}><MoreHorizontal /></button></div>
        <h2>{service.name}</h2><p>{service.description}</p>
        <div className="service-meta"><span><Clock3 size={16} /> {service.durationMinutes} min</span><strong>{formatCurrency(service.priceCents)}</strong></div>
        <label className="switch-row"><span>{service.active ? "Disponível para agendamento" : "Serviço inativo"}</span><input type="checkbox" checked={service.active} onChange={() => toggleService(service.id)} /><i /></label>
      </article>)}
    </div> : <section className="service-empty"><Scissors size={24} /><h2>Seu catálogo ainda está vazio</h2><p>Cadastre os serviços reais da Stilo Sampa para que os clientes possam escolher duração e preço.</p><button className="button secondary" onClick={() => { setFeedback(null); setEditing({ id: "", name: "", description: "", durationMinutes: 45, priceCents: 4500 }); }}><Plus size={16} /> Cadastrar primeiro serviço</button></section>}
    <section className="info-strip"><span><Scissors /></span><div><strong>Preços históricos preservados</strong><p>Quando um serviço é alterado, agendamentos antigos mantêm nome, duração e valor originais.</p></div></section>
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="servico-modal-title"><div className="modal-header"><div><p className="eyebrow">Catálogo</p><h2 id="servico-modal-title">{editing.id ? "Editar serviço" : "Novo serviço"}</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Fechar"><X /></button></div><form key={editing.id || "novo"} className="form-grid" onSubmit={submit}><label className="field full"><span>Nome</span><input name="name" defaultValue={editing.name} required minLength={2} /></label><label className="field full"><span>Descrição</span><textarea name="description" rows={3} defaultValue={editing.description} required /></label><label className="field"><span>Duração (min)</span><input name="duration" type="number" min="10" step="5" defaultValue={editing.durationMinutes} required /></label><label className="field"><span>Preço (R$)</span><input name="price" type="number" min="0" step="0.01" defaultValue={(editing.priceCents / 100).toFixed(2)} required /></label>{feedback && <p className={`form-feedback ${feedback.ok ? "success" : "error"} full`}>{feedback.message}</p>}<div className="modal-actions full"><button type="button" className="button ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="button primary" disabled={submitting}>{submitting ? "Salvando…" : editing.id ? "Salvar alterações" : "Cadastrar serviço"}</button></div></form></section></div>}
  </>;
}

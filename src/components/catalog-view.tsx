"use client";

import { FormEvent, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useAppData } from "@/components/app-data-provider";
import { formatCurrency } from "@/lib/format";

export function parsePrice(value: string) {
  const normalized = value.trim().replace(/\s/g, "");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized.replace(",", ".")) * 100);
  return Number.isSafeInteger(cents) && cents <= 100000000 ? cents : null;
}

type Draft = { id: string; name: string; description: string; priceCents: number; active: boolean; durationMinutes?: number };
export function CatalogView({ kind }: { kind: "service" | "product" }) {
  const { services, products, addService, updateService, toggleService, saveProduct, setProductActive, deleteProduct } = useAppData();
  const isService = kind === "service";
  const singular = isService ? "serviço" : "produto";
  const [editing, setEditing] = useState<Draft | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const items: Draft[] = isService ? services : products;
  function open(item?: Draft) {
    setFeedback(null);
    setEditing(item ?? { id: "", name: "", description: "", priceCents: 0, active: true, durationMinutes: 30 });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !editing) return;
    const data = new FormData(event.currentTarget);
    const priceCents = parsePrice(String(data.get("price")));
    const name = String(data.get("name")).trim();
    const durationMinutes = Number(data.get("duration"));
    if (priceCents === null || name.length < 2 || (isService && (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480))) {
      setFeedback({ ok: false, message: "Confira o nome, o preço e a duração. Para centavos, use vírgula ou ponto." }); return;
    }
    pending.current = true; setBusy(true); setFeedback(null);
    try {
      const payload = { name, description: String(data.get("description") ?? "").trim(), priceCents, durationMinutes };
      const result = isService
        ? editing.id ? await updateService({ ...payload, id: editing.id }) : await addService(payload)
        : await saveProduct({ ...payload, id: editing.id || undefined, active: editing.active });
      setFeedback(result);
      if (result.ok) setEditing(null);
    } catch { setFeedback({ ok: false, message: "A conexão falhou. Tente salvar novamente." }); }
    finally { pending.current = false; setBusy(false); }
  }
  async function toggle(item: Draft) {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try { setFeedback(isService ? await toggleService(item.id) : await setProductActive(item.id, !item.active)); }
    catch { setFeedback({ ok: false, message: "Não foi possível atualizar. Tente novamente." }); }
    finally { pending.current = false; setBusy(false); }
  }
  async function remove(item: Draft) {
    if (isService || item.active || pending.current || !window.confirm(`Excluir o produto “${item.name}”?`)) return;
    pending.current = true; setBusy(true); setFeedback(null);
    try { setFeedback(await deleteProduct(item.id)); }
    catch { setFeedback({ ok: false, message: "Não foi possível excluir. Tente novamente." }); }
    finally { pending.current = false; setBusy(false); }
  }
  return <>
    <PageTitle eyebrow="Catálogo" title={isService ? "Serviços" : "Produtos"} description={isService ? "O que seus clientes podem agendar." : "Produtos e preços da barbearia."} action={<button className="button primary" onClick={() => open()}><Plus size={18} />Novo {singular}</button>} />
    {feedback && !editing && <p role="status" className={`form-feedback ${feedback.ok ? "success" : "error"}`}>{feedback.message}</p>}
    {items.length ? <div className="services-grid">{items.map(item => <article className={`service-card ${!item.active ? "is-inactive" : ""}`} key={item.id}>
      <div className="service-card__head"><h2>{item.name}</h2><div className="service-card-actions"><button className="icon-button" onClick={() => open(item)} aria-label={`Editar ${item.name}`}><Pencil size={18} /></button>{!isService && !item.active && <button className="icon-button danger-action" disabled={busy} onClick={() => void remove(item)} aria-label={`Excluir ${item.name}`}><Trash2 size={18} /></button>}</div></div>
      {item.description && <p>{item.description}</p>}
      <div className="service-meta">{isService && <span>{"durationMinutes" in item ? item.durationMinutes : ""} min</span>}<strong>{formatCurrency(item.priceCents)}</strong></div>
      <label className="switch-row"><span>{item.active ? "Ativo" : "Inativo"}</span><input type="checkbox" checked={item.active} disabled={busy} onChange={() => void toggle(item)} aria-label={`${item.name} ativo`} /><i /></label>
    </article>)}</div> : <section className="service-empty"><h2>Nenhum {singular} cadastrado</h2><p>Cadastre o primeiro para começar.</p><button className="button secondary" onClick={() => open()}>Cadastrar primeiro {singular}</button></section>}
    {editing && <div className="modal-backdrop"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="catalog-title"><div className="modal-header"><h2 id="catalog-title">{editing.id ? "Editar" : "Novo"} {singular}</h2><button className="icon-button" disabled={busy} aria-label="Fechar" onClick={() => setEditing(null)}><X /></button></div>
      <form className="form-grid" onSubmit={submit}>
        <label className="field full"><span>Nome</span><input name="name" defaultValue={editing.name} required minLength={2} maxLength={120} autoFocus /></label>
        <label className="field full"><span>Descrição (opcional)</span><textarea name="description" rows={2} maxLength={1000} defaultValue={editing.description} /></label>
        {isService && <label className="field"><span>Duração (minutos)</span><input name="duration" type="number" min="5" max="480" step="1" defaultValue={editing.durationMinutes} required /></label>}
        <label className="field"><span>Preço (R$)</span><input name="price" type="text" inputMode="decimal" placeholder="0,00" defaultValue={editing.id ? (editing.priceCents / 100).toFixed(2).replace(".", ",") : ""} required /></label>
        {feedback && <p role="alert" className={`form-feedback ${feedback.ok ? "success" : "error"} full`}>{feedback.message}</p>}
        <div className="modal-actions full"><button className="button ghost" type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? "Salvando…" : editing.id ? "Salvar alterações" : `Cadastrar ${singular}`}</button></div>
      </form>
    </section></div>}
  </>;
}

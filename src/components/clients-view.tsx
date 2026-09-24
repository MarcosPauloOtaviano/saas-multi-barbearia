"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Mail, MessageCircle, Plus, Search, Sparkles, UserRoundPlus, X } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useAppData } from "@/components/app-data-provider";
import { initials } from "@/lib/format";
import { useAdminBase } from "@/lib/admin-route";

export function ClientsView() {
  const { clients, addClient } = useAppData();
  const base = useAdminBase();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => clients.filter((client) => `${client.name} ${client.phone} ${client.email}`.toLowerCase().includes(query.toLowerCase())), [clients, query]);
  const returnClients = clients.filter((client) => !client.nextVisit && (client.averageReturnDays ?? 999) <= 30 && client.visits > 2);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addClient({ name: String(data.get("name")), phone: String(data.get("phone")), email: String(data.get("email")), notes: String(data.get("notes") || "") });
    setModalOpen(false);
  }

  return (
    <>
      <PageTitle eyebrow="Relacionamento" title="Clientes" description="Histórico, preferências e oportunidades de retorno." action={<button className="button primary" onClick={() => setModalOpen(true)}><UserRoundPlus size={18} /> Novo cliente</button>} />
      <section className="return-banner">
        <span className="return-banner__icon"><Sparkles /></span>
        <div><p className="eyebrow">Retorno inteligente</p><h2>{returnClients.length} clientes podem estar prontos para voltar</h2><p>O sistema encontrou pessoas que ultrapassaram o próprio intervalo habitual entre visitas.</p></div>
        <a className="button light" href="#oportunidades">Ver oportunidades <ChevronRight size={17} /></a>
      </section>
      <section className="content-card">
        <div className="list-toolbar"><label className="search-control"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone ou e-mail" /></label><span>{filtered.length} clientes</span></div>
        <div className="client-list">
          {filtered.map((client) => (
            <article className="client-row" key={client.id}>
              <span className="client-avatar">{initials(client.name)}</span>
              <div className="client-main"><strong>{client.name}</strong><span>{client.phone} · {client.email}</span></div>
              <div className="client-stat"><small>Atendimentos</small><strong>{client.visits}</strong></div>
              <div className="client-stat"><small>Último</small><strong>{client.lastVisit}</strong></div>
              <div className="client-stat next"><small>Próximo</small><strong>{client.nextVisit ?? "Sem agendamento"}</strong></div>
              <div className="client-actions">{client.email && <a href={`mailto:${client.email}`} aria-label={`Enviar e-mail para ${client.name}`}><Mail /></a>}<Link href={`${base}/agenda?novo=1&cliente=${client.id}`} aria-label={`Agendar ${client.name}`}><Plus /></Link></div>
            </article>
          ))}
        </div>
      </section>
      <section className="content-card compact-card" id="oportunidades">
        <div className="section-heading compact"><div><p className="eyebrow">Oportunidades</p><h2>Clientes para recuperar</h2></div><span className="count-badge">{returnClients.length}</span></div>
        {returnClients.map((client) => <div className="opportunity-row" key={client.id}><span className="client-avatar small">{initials(client.name)}</span><div><strong>{client.name}</strong><small>Costuma voltar a cada {client.averageReturnDays} dias · último em {client.lastVisit}</small></div>{client.phone ? <a className="button subtle" href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Preparar contato</a> : <Link className="button subtle" href={`${base}/agenda?novo=1&cliente=${client.id}`}><Plus size={16} /> Agendar</Link>}</div>)}
      </section>
      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><section className="modal-card" role="dialog" aria-modal="true"><div className="modal-header"><div><p className="eyebrow">Cadastro</p><h2>Novo cliente</h2></div><button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Fechar"><X /></button></div><form className="form-grid" onSubmit={submit}><label className="field full"><span>Nome completo</span><input name="name" required minLength={2} /></label><label className="field"><span>Telefone</span><input name="phone" type="tel" required /></label><label className="field"><span>E-mail</span><input name="email" type="email" required /></label><label className="field full"><span>Observações</span><textarea name="notes" rows={3} placeholder="Preferências e informações úteis" /></label><div className="modal-actions full"><button type="button" className="button ghost" onClick={() => setModalOpen(false)}>Cancelar</button><button className="button primary">Salvar cliente</button></div></form></section></div>}
    </>
  );
}

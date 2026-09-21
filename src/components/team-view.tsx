"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { Camera, Plus, Power, Trash2, X } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { BarberAvatar } from "@/components/barber-avatar";
import { useAppData } from "@/components/app-data-provider";
import { useAdminBase } from "@/lib/admin-route";
import type { MemberRole } from "@/lib/types";

const roles: Record<MemberRole,string> = {owner:"Proprietário",manager:"Gerente",barber:"Barbeiro",receptionist:"Recepcionista"};
export function TeamView() {
  const { barbers, teamMembers, appointments, addBarber, inviteTeamMember, updateBarberAvatar, setBarberActive, deleteBarber, role } = useAppData();
  const base = useAdminBase();
  const [modal, setModal] = useState<"professional" | "access" | null>(null);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ok:boolean;message:string} | null>(null);
  const today = new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date());
  function open(kind: "professional" | "access", id = "") {setModal(kind);setTarget(id);setFeedback(null);}
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name")).trim(); const color = String(data.get("color") ?? "#356f68");
    setBusy(true); setFeedback(null);
    try {
      const result = modal === "professional" ? await addBarber({name,color}) : await inviteTeamMember({name,color,email:String(data.get("email")).trim(),initialPassword:String(data.get("initialPassword") ?? ""),role:target?"barber":String(data.get("role")) as MemberRole,barberId:target||undefined});
      setFeedback(result); if(result.ok) setModal(null);
    } catch {setFeedback({ok:false,message:"Não foi possível salvar. Verifique a conexão e tente novamente."});}
    finally {setBusy(false);}
  }
  async function photo(id:string,file?:File) {
    if(!file||busy)return;setBusy(true);
    try {setFeedback(await updateBarberAvatar(id,file));} catch {setFeedback({ok:false,message:"Não foi possível enviar a foto."});} finally {setBusy(false);}
  }
  async function toggleActive(id: string, active: boolean) {
    if (busy) return;
    setBusy(true); setFeedback(null);
    try { setFeedback(await setBarberActive(id, !active)); } catch { setFeedback({ok:false,message:"Não foi possível atualizar o status."}); } finally { setBusy(false); }
  }
  async function remove(id: string, name: string) {
    if (busy || !window.confirm(`Excluir o perfil de ${name}? Essa ação só funciona quando não há histórico que precise ser preservado.`)) return;
    setBusy(true); setFeedback(null);
    try { setFeedback(await deleteBarber(id)); } catch { setFeedback({ok:false,message:"Não foi possível excluir o perfil."}); } finally { setBusy(false); }
  }
  return <><PageTitle eyebrow="Barbearia" title="Equipe" description="Profissionais, fotos e acesso à agenda." action={<button className="button primary" onClick={()=>open("professional")}><Plus size={18}/>Cadastrar profissional</button>}/>
    {feedback&&!modal&&<p role="status" className={`form-feedback ${feedback.ok?"success":"error"}`}>{feedback.message}</p>}
    <div className="team-grid">{barbers.map(barber=>{
      const member=teamMembers.find(m=>m.barberId===barber.id);
      return <article className={`team-card ${!barber.active ? "is-inactive" : ""}`} key={barber.id}><div className="team-card__head"><BarberAvatar barber={barber} className="team-avatar"/><div><h2>{barber.name}</h2><p>{member?.role==="owner"?"Proprietário e barbeiro":"Barbeiro"}</p></div></div>
        <label className="button secondary photo-label"><Camera size={17}/>{busy?"Aguarde…":"Alterar foto"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-label={`Alterar foto de ${barber.name}`} onChange={e=>{void photo(barber.id,e.target.files?.[0]);e.target.value="";}}/></label>
        <p className="table-hint">{barber.active ? `${appointments.filter(a=>a.barberId===barber.id&&a.date===today&&a.status!=="cancelled").length} agendamentos hoje` : "Profissional inativo; não aparece para novos agendamentos."}</p>
        <div className="team-card__footer"><Link href={`${base}/agenda?barber=${barber.id}`}>Ver agenda</Link><Link href={`${base}/horarios`}>Dias e horários</Link></div>
        <div className="team-card__controls"><button className="button subtle" disabled={busy || member?.role === "owner"} onClick={()=>void toggleActive(barber.id, barber.active)}><Power size={15}/>{barber.active?"Inativar":"Reativar"}</button>{!barber.active && role === "owner" && <button className="button subtle danger-action" disabled={busy} onClick={()=>void remove(barber.id, barber.name)}><Trash2 size={15}/>Excluir perfil</button>}</div>
        {member?<p className="table-hint">{roles[member.role]} · {member.status==="active"?"Acesso ativo":member.status==="invited"?"Aguardando primeiro acesso":"Acesso suspenso"}</p>:<button className="button subtle" onClick={()=>open("access",barber.id)}>Criar acesso de barbeiro</button>}
      </article>;
    })}</div>
    <section className="content-card settings-section"><h2>Acessos individuais</h2><p>O proprietário administra a loja. O barbeiro acessa somente sua agenda e seu perfil.</p>{teamMembers.map(m=><div className="team-access-row" key={m.id}><strong>{m.name}</strong><span>{roles[m.role]}</span><small>{m.status==="active"?"Ativo":m.status==="invited"?"Convite enviado":"Suspenso"}</small></div>)}<button className="button secondary" onClick={()=>open("access")}>Convidar pessoa</button></section>
    {modal&&<div className="modal-backdrop"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="team-modal"><div className="modal-header"><h2 id="team-modal">{modal==="professional"?"Cadastrar profissional":"Liberar acesso"}</h2><button className="icon-button" disabled={busy} onClick={()=>setModal(null)} aria-label="Fechar"><X/></button></div><form className="form-grid" onSubmit={submit}>
      <label className="field full"><span>Nome</span><input name="name" defaultValue={barbers.find(b=>b.id===target)?.name??""} readOnly={!!target} required minLength={2} maxLength={100}/></label>
      {modal==="access"&&<><label className="field full"><span>E-mail de login</span><input name="email" type="email" required autoComplete="username"/></label>{!target&&<label className="field full"><span>Função</span><select name="role" defaultValue="barber"><option value="barber">Barbeiro</option><option value="receptionist">Recepcionista</option>{role==="owner"&&<option value="manager">Gerente</option>}</select></label>}<label className="field full"><span>Senha inicial</span><input name="initialPassword" type="password" required minLength={8} autoComplete="new-password"/><small>O barbeiro troca essa senha no primeiro acesso. Não enviamos a senha por e-mail.</small></label><p className="table-hint full">Entregue o e-mail e a senha inicial por um canal seguro. {target&&"Este acesso usa o profissional já cadastrado, sem duplicar a agenda."}</p></>}
      <label className="field full"><span>Cor na agenda</span><input type="color" name="color" defaultValue={barbers.find(b=>b.id===target)?.color??"#356f68"}/></label>
      {feedback&&<p role="alert" className={`form-feedback full ${feedback.ok?"success":"error"}`}>{feedback.message}</p>}
      <div className="modal-actions full"><button type="button" className="button ghost" disabled={busy} onClick={()=>setModal(null)}>Cancelar</button><button className="button primary" disabled={busy}>{busy?"Aguarde…":modal==="professional"?"Cadastrar profissional":"Criar acesso"}</button></div>
    </form></section></div>}
  </>;
}

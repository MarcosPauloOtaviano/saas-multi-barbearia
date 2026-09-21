"use client";
import { FormEvent, useState } from "react";
import { Camera } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { BarberAvatar } from "@/components/barber-avatar";
import { useAppData } from "@/components/app-data-provider";
import { createClient } from "@/lib/supabase/client";

export function ProfileView() {
  const { barbers, ownBarberId, currentUserName, role, updateBarberAvatar } = useAppData();
  const barber = barbers.find(b => b.id === ownBarberId);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  async function photo(file?: File) {
    if (!file || !barber || busy) return;
    setBusy(true);
    try { setFeedback(await updateBarberAvatar(barber.id, file)); }
    catch { setFeedback({ok:false,message:"Não foi possível enviar a foto. Tente novamente."}); }
    finally { setBusy(false); }
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const form = e.currentTarget; const data = new FormData(form);
    const next = String(data.get("newPassword"));
    if (next.length < 10 || next !== data.get("confirm")) { setFeedback({ok:false,message:"Use pelo menos 10 caracteres e repita a mesma senha."}); return; }
    setBusy(true); setFeedback(null);
    try {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user?.email) throw new Error("session");
      const { error: reauthError } = await db.auth.signInWithPassword({ email: user.email, password: String(data.get("currentPassword")) });
      if (reauthError) { setFeedback({ok:false,message:"A senha atual não confere."}); return; }
      const { error } = await db.auth.updateUser({ password: next });
      if (error) { setFeedback({ok:false,message:"Não foi possível alterar a senha. Use uma senha diferente e tente novamente."}); return; }
      await db.auth.signOut({ scope: "others" });
      form.reset(); setFeedback({ok:true,message:"Senha alterada. As outras sessões foram encerradas."});
    } catch { setFeedback({ok:false,message:"A conexão falhou. Tente novamente."}); }
    finally { setBusy(false); }
  }
  return <><PageTitle eyebrow="Sua conta" title="Meu perfil" description={currentUserName} />
    <section className="content-card operating-card">
      {barber && <div className="profile-photo-row"><BarberAvatar barber={barber} className="team-avatar" /><label className="button secondary photo-label"><Camera size={18} />{busy ? "Aguarde…" : "Alterar minha foto"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-label="Alterar minha foto" onChange={e => {void photo(e.target.files?.[0]);e.target.value="";}} /></label></div>}
      <p className="table-hint">{role === "owner" ? "Proprietário: gestão da barbearia e atendimentos." : role === "barber" ? "Barbeiro: sua agenda e seu perfil, sem acesso à administração." : "Acesso individual à barbearia."}</p>
      <h2>Alterar senha</h2><form onSubmit={password} className="form-grid">
        <label className="field full"><span>Senha atual</span><input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <label className="field full"><span>Nova senha</span><input name="newPassword" type="password" autoComplete="new-password" minLength={10} required /><small>No mínimo 10 caracteres.</small></label>
        <label className="field full"><span>Repetir nova senha</span><input name="confirm" type="password" autoComplete="new-password" minLength={10} required /></label>
        <button className="button primary" disabled={busy}>{busy ? "Aguarde…" : "Alterar senha"}</button>
      </form>{feedback && <p role="status" className={`form-feedback ${feedback.ok ? "success" : "error"}`}>{feedback.message}</p>}
    </section></>;
}

"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Scissors, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setPending(false);
      setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
      return;
    }
    const { error: setupError } = await supabase.rpc("complete_password_setup");
    if (setupError) {
      setPending(false);
      setError("A senha foi alterada, mas não foi possível concluir a ativação. Entre novamente e tente de novo.");
      return;
    }
    await supabase.auth.signOut();
    router.replace(nextPath);
    router.refresh();
  }

  return <main className="login-page">
    <section className="login-brand-panel"><div className="login-brand"><span><Scissors /></span><strong>BarberFlow</strong></div><div className="login-message"><p className="eyebrow">Proteção da conta</p><h1>Uma senha só sua.</h1><p>Atualize seu acesso por um link temporário e continue mantendo a operação da barbearia protegida.</p></div><div className="login-proof"><span><ShieldCheck /></span><p><strong>Link de uso único</strong><small>O acesso de recuperação expira e não pode ser reutilizado.</small></p></div></section>
    <section className="login-form-panel"><div className="login-form-wrap"><div className="mobile-login-brand"><span><Scissors /></span><strong>BarberFlow</strong></div><p className="eyebrow">Recuperar acesso</p><h2>Crie uma nova senha</h2><p>Escolha uma senha com pelo menos 8 caracteres. Ela substituirá a senha atual.</p>
      <form onSubmit={submit} className="login-fields"><label className="field"><span>Nova senha</span><div className="icon-input"><LockKeyhole /><input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label><label className="field"><span>Confirme a nova senha</span><div className="icon-input"><LockKeyhole /><input name="confirmation" type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" required /><button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Ocultar confirmação" : "Mostrar confirmação"}>{showConfirmation ? <EyeOff /> : <Eye />}</button></div></label>{error && <p className="form-feedback error">{error}</p>}<button className="button primary login-submit" disabled={pending}>{pending ? "Atualizando…" : "Salvar nova senha"}<ArrowRight /></button></form><small className="login-privacy">Depois de salvar, você deverá entrar novamente com a nova senha.</small>
    </div></section>
  </main>;
}

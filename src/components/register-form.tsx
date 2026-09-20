"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Scissors, UserRound } from "lucide-react";
import { signUp, type AuthState } from "@/app/auth/actions";

export function RegisterForm({ demoMode }: { demoMode: boolean }) {
  const [state, action, pending] = useActionState(signUp, {} as AuthState);
  const [show, setShow] = useState(false);
  return <main className="response-page"><section className="onboarding-card"><div className="onboarding-brand"><span><Scissors /></span><strong>Navalha</strong></div><div className="onboarding-head"><p className="eyebrow">Nova conta</p><h1>Comece sua barbearia.</h1><p>Crie seu acesso de proprietário. Você configurará a equipe e os serviços na próxima etapa.</p></div><form action={action} className="login-fields"><label className="field"><span>Seu nome</span><div className="icon-input"><UserRound /><input name="fullName" required minLength={2} /></div></label><label className="field"><span>E-mail</span><div className="icon-input"><Mail /><input name="email" type="email" required /></div></label><label className="field"><span>Senha</span><div className="icon-input"><LockKeyhole /><input name="password" type={show ? "text" : "password"} minLength={8} required /><button type="button" onClick={() => setShow((value) => !value)}>{show ? <EyeOff /> : <Eye />}</button></div></label>{state.error && <p className="form-feedback error">{state.error}</p>}{state.success && <p className="form-feedback success">{state.success}</p>}<button className="button primary login-submit" disabled={pending}>Criar conta <ArrowRight /></button></form>{demoMode && <Link className="button subtle login-demo-link" href="/onboarding">Continuar em modo demonstração</Link>}<p className="register-footer">Já possui uma conta? <Link href="/login">Entrar</Link></p></section></main>;
}

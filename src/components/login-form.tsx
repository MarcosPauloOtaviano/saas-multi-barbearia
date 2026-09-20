"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Scissors, ShieldCheck, Smartphone } from "lucide-react";
import { sendReset, signIn, type AuthState } from "@/app/auth/actions";

const initialState: AuthState = {};

export function LoginForm({ demoMode }: { demoMode: boolean }) {
  const [reset, setReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, loginAction, loginPending] = useActionState(signIn, initialState);
  const [resetState, resetAction, resetPending] = useActionState(sendReset, initialState);
  const state = reset ? resetState : loginState;
  return <main className="login-page">
    <section className="login-brand-panel"><div className="login-brand"><span><Scissors /></span><strong>Navalha</strong></div><div className="login-message"><p className="eyebrow">Sua barbearia no bolso</p><h1>Menos tempo organizando. Mais tempo atendendo.</h1><p>Agenda, confirmações, clientes e relatórios em uma experiência feita para o iPhone.</p></div><div className="login-proof"><span><Smartphone /></span><p><strong>Operação móvel de verdade</strong><small>O dia inteiro cabe na primeira tela.</small></p></div><div className="login-proof"><span><ShieldCheck /></span><p><strong>Dados isolados por barbearia</strong><small>Segurança aplicada também no banco.</small></p></div></section>
    <section className="login-form-panel"><div className="login-form-wrap"><div className="mobile-login-brand"><span><Scissors /></span><strong>Navalha</strong></div><p className="eyebrow">{reset ? "Recuperar acesso" : "Bem-vindo de volta"}</p><h2>{reset ? "Redefina sua senha" : "Entre na sua barbearia"}</h2><p>{reset ? "Informe seu e-mail para receber um link seguro." : "Use seu e-mail e senha para continuar."}</p>
      <form action={reset ? resetAction : loginAction} className="login-fields"><label className="field"><span>E-mail</span><div className="icon-input"><Mail /><input name="email" type="email" placeholder="voce@barbearia.com" required /></div></label>{!reset && <label className="field"><span>Senha</span><div className="icon-input"><LockKeyhole /><input name="password" type={showPassword ? "text" : "password"} placeholder="Sua senha" minLength={8} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>}{state.error && <p className="form-feedback error">{state.error}</p>}{state.success && <p className="form-feedback success">{state.success}</p>}<button className="button primary login-submit" disabled={loginPending || resetPending}>{reset ? "Enviar link seguro" : "Entrar"}<ArrowRight /></button></form>
      <button className="login-link" onClick={() => setReset((value) => !value)}>{reset ? "Voltar para o login" : "Esqueci minha senha"}</button>
      {!reset && <p className="register-footer">Ainda não usa o Navalha? <Link href="/cadastro">Criar conta</Link></p>}
      {demoMode && <div className="demo-login"><span>Ambiente local</span><p>O Supabase ainda não está conectado. Explore o painel da barbearia com dados seguros de demonstração.</p><Link className="button subtle" href="/admin">Abrir painel demonstrativo <ArrowRight size={17} /></Link></div>}
      <small className="login-privacy">Ao entrar, você concorda com os termos de uso e a política de privacidade.</small>
    </div></section>
  </main>;
}

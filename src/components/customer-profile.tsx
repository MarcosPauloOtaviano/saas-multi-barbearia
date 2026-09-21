"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function CustomerProfile() {
  return <section className="customer-page">
    <div className="customer-page-title"><p className="eyebrow">Privacidade</p><h1>Seu acesso é sem senha.</h1><p>Os links enviados ao seu e-mail permitem administrar somente o agendamento correspondente.</p></div>
    <div className="customer-access-card"><span><ShieldCheck /></span><h2>Dados protegidos</h2><p>A barbearia usa seus dados apenas para administrar horários e lembretes solicitados por você.</p><Link className="button primary" href="/">Voltar para o início</Link></div>
  </section>;
}

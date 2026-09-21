"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

export function CustomerAppointments() {
  return <section className="customer-page">
    <div className="customer-page-title"><p className="eyebrow">Sua agenda</p><h1>Meus horários</h1><p>Use o link seguro recebido por e-mail para confirmar ou cancelar cada agendamento.</p></div>
    <div className="customer-access-card"><span><CalendarDays /></span><h2>Abra seu e-mail</h2><p>Após reservar, enviamos um link pessoal para acompanhar o horário sem criar senha.</p><Link className="button primary" href="/">Voltar para o início</Link></div>
  </section>;
}

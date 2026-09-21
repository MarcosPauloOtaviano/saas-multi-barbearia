import Link from "next/link";
import { ArrowRight, CalendarDays, Mail, ShieldCheck } from "lucide-react";

export function CustomerAccount() {
  return <section className="customer-page customer-account-page">
    <div className="customer-page-title"><p className="eyebrow">Conta do cliente</p><h1>Seus horários em um só lugar.</h1><p>Não é obrigatório criar senha. Use o link seguro enviado para o seu e-mail para acessar um agendamento.</p></div>
    <div className="customer-account-grid">
      <article className="customer-access-card"><span><CalendarDays /></span><h2>Acompanhar horário</h2><p>Abra o e-mail de confirmação para remarcar ou cancelar com segurança.</p><Link className="button primary" href="/">Voltar para o início <ArrowRight /></Link></article>
      <article className="customer-access-card"><span><ShieldCheck /></span><h2>Privacidade primeiro</h2><p>Seus dados ficam ligados ao atendimento solicitado e não são compartilhados entre estabelecimentos.</p><span className="customer-account-note"><Mail /> Sem senha obrigatória</span></article>
    </div>
  </section>;
}

import Link from "next/link";

export const metadata = {
  title: "Privacidade e LGPD — BarberFlow",
  description: "Como o BarberFlow trata os dados usados nos agendamentos.",
};

export default function PrivacyPage() {
  return <main className="legal-page"><header className="legal-header"><Link href="/" className="legal-brand">BarberFlow</Link><Link href="/">Voltar</Link></header><article className="legal-card"><p className="eyebrow">Privacidade e LGPD</p><h1>Seus dados ficam no seu atendimento.</h1><p>O BarberFlow usa somente as informações necessárias para criar, confirmar, lembrar, alterar ou cancelar um agendamento.</p><h2>O que é usado</h2><p>Nome, e-mail e, quando informado, telefone. Esses dados ficam ligados ao estabelecimento e ao horário escolhido.</p><h2>O que não fazemos</h2><p>Não vendemos dados, não compartilhamos informações entre estabelecimentos e não exigimos senha para agendar.</p><h2>Seus direitos</h2><p>Você pode solicitar correção ou exclusão dos seus dados pelo contato da barbearia ou pelo WhatsApp do BarberFlow: <a href="https://wa.me/5535988440656">+55 35 98844-0656</a>.</p><p className="legal-updated">Última atualização: 24 de setembro de 2026.</p></article></main>;
}

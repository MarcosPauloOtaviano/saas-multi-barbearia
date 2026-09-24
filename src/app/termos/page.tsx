import Link from "next/link";

export const metadata = {
  title: "Termos de uso — BarberFlow",
  description: "Termos básicos de uso do BarberFlow.",
};

export default function TermsPage() {
  return <main className="legal-page"><header className="legal-header"><Link href="/" className="legal-brand">BarberFlow</Link><Link href="/">Voltar</Link></header><article className="legal-card"><p className="eyebrow">Termos de uso</p><h1>Agendamento simples e responsável.</h1><p>Ao usar uma página do BarberFlow, você confirma que as informações fornecidas são verdadeiras e que o horário escolhido será usado para o atendimento indicado.</p><h2>Agendamentos</h2><p>O horário depende da disponibilidade real do estabelecimento. Use o link enviado para confirmar ou cancelar quando necessário.</p><h2>Estabelecimentos</h2><p>Cada barbearia é responsável pelos seus serviços, preços, horários e atendimento. Os dados de uma operação não são misturados com os de outra.</p><h2>Contato</h2><p>Para dúvidas sobre o BarberFlow, fale pelo WhatsApp <a href="https://wa.me/5535988440656">+55 35 98844-0656</a>.</p><p className="legal-updated">Última atualização: 24 de setembro de 2026.</p></article></main>;
}

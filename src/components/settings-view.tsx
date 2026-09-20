"use client";

import { useState } from "react";
import { BellRing, Check, Database, ExternalLink, LockKeyhole, Mail, RotateCcw, Save, ShieldCheck, Smartphone } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { useDemo } from "@/components/demo-provider";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export function SettingsView() {
  const { resetDemo } = useDemo();
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  function save() { setSaved(true); window.setTimeout(() => setSaved(false), 1800); }

  return <>
    <PageTitle eyebrow="Personalização" title="Configurações" description="Identidade, automações, segurança e privacidade da barbearia." action={<button className="button primary" onClick={save}>{saved ? <Check size={17} /> : <Save size={17} />}{saved ? "Salvo" : "Salvar alterações"}</button>} />
    <div className="settings-grid">
      <section className="content-card settings-section"><div className="settings-heading"><span><Smartphone /></span><div><h2>Identidade da barbearia</h2><p>Aplicada ao painel e à página pública sem quebrar a consistência do produto.</p></div></div><div className="form-grid settings-form"><label className="field full"><span>Nome</span><input defaultValue="Barbearia Stilo Sampa" /></label><label className="field full"><span>Endereço público</span><div className="input-prefix"><span>agenda.app/</span><input defaultValue="stilo-sampa" /></div></label><label className="field"><span>Cor principal</span><div className="color-control"><input type="color" defaultValue="#183c36" /><code>#183c36</code></div></label><label className="field"><span>Cor de destaque</span><div className="color-control"><input type="color" defaultValue="#c86f45" /><code>#c86f45</code></div></label><a className="button subtle full" href="/b/stilo-sampa" target="_blank">Ver página pública <ExternalLink size={16} /></a></div></section>
      <section className="content-card settings-section"><div className="settings-heading"><span><Mail /></span><div><h2>Lembretes automáticos</h2><p>E-mails idempotentes com histórico de envio e falhas.</p></div></div><div className="reminder-setting"><div><strong>Primeiro lembrete</strong><small>Antes do atendimento</small></div><select defaultValue="1440"><option value="1440">24 horas antes</option><option value="2880">48 horas antes</option></select><label className="mini-switch"><input type="checkbox" defaultChecked /><i /></label></div><div className="reminder-setting"><div><strong>Segundo lembrete</strong><small>Reforço no mesmo dia</small></div><select defaultValue="120"><option value="120">2 horas antes</option><option value="180">3 horas antes</option></select><label className="mini-switch"><input type="checkbox" defaultChecked /><i /></label></div><div className="channel-roadmap"><BellRing /><span><strong>Arquitetura por canais</strong><small>E-mail ativo · Push disponível · WhatsApp preparado para o futuro</small></span></div></section>
      <section className="content-card settings-section"><div className="settings-heading"><span><BellRing /></span><div><h2>Push no iPhone</h2><p>Funciona em aparelhos compatíveis quando a PWA está instalada.</p></div></div><div className="push-box"><span className={`permission-dot ${permission}`} /><div><strong>{permission === "granted" ? "Notificações permitidas" : permission === "denied" ? "Notificações bloqueadas" : "Permissão ainda não solicitada"}</strong><small>O pedido aparece somente após uma ação do usuário.</small></div><button className="button subtle" onClick={enableNotifications} disabled={permission === "granted"}>{permission === "granted" ? "Ativado" : "Ativar push"}</button></div></section>
      <section className="content-card settings-section"><div className="settings-heading"><span><ShieldCheck /></span><div><h2>Segurança e LGPD</h2><p>Controles previstos desde a modelagem dos dados.</p></div></div><div className="security-list"><div><LockKeyhole /><span><strong>Isolamento por tenant</strong><small>RLS em todas as tabelas expostas e testes contra acesso cruzado.</small></span></div><div><Database /><span><strong>Retenção configurável</strong><small>Solicitações de exportação, correção e exclusão têm rastreio próprio.</small></span></div><div><ShieldCheck /><span><strong>Credenciais protegidas</strong><small>Nenhuma chave privilegiada é enviada ao navegador.</small></span></div></div></section>
      {!hasSupabaseEnv && <section className="content-card settings-section danger-zone"><div><h2>Dados de demonstração</h2><p>Restaura clientes, agenda, serviços e avisos exibidos localmente.</p></div><button className="button danger" onClick={resetDemo}><RotateCcw size={17} /> Restaurar demonstração</button></section>}
    </div>
  </>;
}

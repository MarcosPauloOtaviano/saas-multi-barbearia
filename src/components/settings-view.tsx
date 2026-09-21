"use client";
import Link from "next/link";
import { PageTitle } from "@/components/app-shell";
import { useAdminBase } from "@/lib/admin-route";
export function SettingsView() {
  const base = useAdminBase();
  return <><PageTitle eyebrow="Barbearia" title="Ajustes" description="Gerencie o funcionamento e os acessos." /><div className="settings-grid"><Link className="content-card settings-section" href={`${base}/horarios`}><h2>Dias e horários</h2><p>Abertura, fechamento, folgas e pausa de reservas.</p></Link><Link className="content-card settings-section" href={`${base}/equipe`}><h2>Equipe</h2><p>Profissionais, fotos e acessos individuais.</p></Link><Link className="content-card settings-section" href={`${base}/perfil`}><h2>Meu perfil e senha</h2><p>Atualize sua foto e altere sua senha.</p></Link></div></>;
}

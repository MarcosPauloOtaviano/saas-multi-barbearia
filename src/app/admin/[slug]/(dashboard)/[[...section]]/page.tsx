import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AgendaView } from "@/components/agenda-view";
import { ClientsView } from "@/components/clients-view";
import { DashboardHome } from "@/components/dashboard-home";
import { NotificationsView } from "@/components/notifications-view";
import { ReportsView } from "@/components/reports-view";
import { ServicesView } from "@/components/services-view";
import { SettingsView } from "@/components/settings-view";
import { TeamView } from "@/components/team-view";

export default async function TenantDashboardPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  if (section.length === 0) return <DashboardHome />;
  if (section.length !== 1) notFound();
  switch (section[0]) {
    case "agenda": return <Suspense fallback={<section className="agenda-board"><p>Carregando agenda…</p></section>}><AgendaView /></Suspense>;
    case "clientes": return <ClientsView />;
    case "configuracoes": return <SettingsView />;
    case "equipe": return <TeamView />;
    case "notificacoes": return <NotificationsView />;
    case "relatorios": return <ReportsView />;
    case "servicos": return <ServicesView />;
    default: notFound();
  }
}

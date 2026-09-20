import { Suspense } from "react";
import { AgendaView } from "@/components/agenda-view";

export default function AgendaPage() {
  return <Suspense fallback={<section className="agenda-board"><p>Carregando agenda…</p></section>}><AgendaView /></Suspense>;
}

import { Suspense } from "react";
import { AppointmentResponse } from "@/components/appointment-response";

export default function AppointmentResponsePage() {
  return <Suspense fallback={<main className="response-page"><p>Carregando…</p></main>}><AppointmentResponse /></Suspense>;
}

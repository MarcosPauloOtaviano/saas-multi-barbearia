"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck, CircleX, LoaderCircle, Scissors } from "lucide-react";

export function AppointmentResponse() {
  const params = useSearchParams();
  const token = params.get("token");
  const action = params.get("action") === "cancel" ? "cancel" : "confirm";
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key || !token) { const timeout = window.setTimeout(() => setState(token ? "success" : "error"), 700); return () => window.clearTimeout(timeout); }
    fetch(`${url}/functions/v1/appointment-response`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ token, action }) }).then((response) => { if (!response.ok) throw new Error(); setState("success"); }).catch(() => setState("error"));
  }, [token, action]);

  return <main className="response-page"><div className="response-brand"><span><Scissors /></span> BarberFlow</div><section className="response-card">{state === "loading" && <><LoaderCircle className="spin" /><h1>Atualizando seu agendamento…</h1><p>Isso leva apenas alguns segundos.</p></>}{state === "success" && <>{action === "confirm" ? <CalendarCheck className="response-success" /> : <CircleX className="response-cancel" />}<p className="eyebrow">Resposta registrada</p><h1>{action === "confirm" ? "Presença confirmada!" : "Agendamento cancelado"}</h1><p>{action === "confirm" ? "A barbearia já foi avisada. Esperamos você no horário combinado." : "O horário foi liberado e a barbearia já recebeu a atualização."}</p><Link className="button primary" href="/">Voltar ao início</Link></>}{state === "error" && <><CircleX className="response-cancel" /><p className="eyebrow">Link indisponível</p><h1>Não foi possível atualizar</h1><p>O link pode ter expirado ou já ter sido utilizado. Entre em contato com a barbearia.</p></>}</section></main>;
}

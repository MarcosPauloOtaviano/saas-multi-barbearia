"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, Scissors, ShieldCheck, Smartphone } from "lucide-react";
import { createBarbershop, type OnboardingState } from "@/app/onboarding/actions";

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [state, action, pending] = useActionState(createBarbershop, {} as OnboardingState);
  function updateName(value: string) { setName(value); setSlug(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }
  return <main className="onboarding-page"><section className="onboarding-card"><div className="onboarding-brand"><span><Scissors /></span><strong>Navalha</strong></div><div className="onboarding-head"><p className="eyebrow">Primeiros passos</p><h1>Vamos preparar sua barbearia.</h1><p>São apenas os dados essenciais. Serviços, equipe e horários vêm logo depois.</p></div><form action={action} className="form-grid"><label className="field full"><span>Seu nome</span><input name="ownerName" placeholder="Como devemos chamar você?" required minLength={2} /></label><label className="field full"><span>Nome da barbearia</span><input name="name" value={name} onChange={(event) => updateName(event.target.value)} placeholder="Ex.: Barbearia do João" required minLength={2} /></label><label className="field full"><span>Endereço público</span><div className="input-prefix"><span>navalha.app/</span><input name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></div></label>{state.error && <p className="form-feedback error full">{state.error}</p>}<button className="button primary full" disabled={pending}>Criar minha barbearia <ArrowRight /></button></form><div className="onboarding-trust"><span><ShieldCheck /><small>Dados isolados por tenant</small></span><span><Smartphone /><small>Feito para o celular</small></span><span><Check /><small>Sem dados de cartão</small></span></div></section></main>;
}

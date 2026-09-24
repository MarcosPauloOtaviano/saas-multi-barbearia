"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Scissors, ShieldCheck, UserRound } from "lucide-react";
import { BarberAvatar } from "@/components/barber-avatar";
import { useAppData } from "@/components/app-data-provider";
import { formatCurrency } from "@/lib/format";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import type { Barber, Service } from "@/lib/types";

type PublicBarber = Barber & { serviceIds?: string[] };
type AvailableTime = { label: string; iso: string; barberId: string; barberName: string };
type AvailableTimeGroup = { label: string; iso: string; barbers: { id: string; name: string }[] };

const bookingDates = Array.from({ length: 7 }, (_, offset) => {
  const date = new Date(Date.now() + offset * 86_400_000);
  return {
    weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" }).format(date).replace(".", "").toUpperCase(),
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "America/Sao_Paulo" }).format(date),
    iso: new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo" }).format(date),
  };
});

export function BookingWizard({ slug, initialServiceId = "" }: { slug: string; initialServiceId?: string }) {
  const { services, barbers } = useAppData();
  const [step, setStep] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>(initialServiceId ? [initialServiceId] : []);
  const [barberId, setBarberId] = useState("");
  const [assignedBarberId, setAssignedBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(bookingDates[0].iso);
  const [time, setTime] = useState("");
  const [slotIso, setSlotIso] = useState("");
  const [publicServices, setPublicServices] = useState<Service[]>(services);
  const [publicBarbers, setPublicBarbers] = useState<PublicBarber[]>(barbers);
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(true);
  const inferredShopName = slug.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ") || "Estabelecimento";
  const [shop, setShop] = useState({ name: inferredShopName, bookingMessage: "", timezone: "America/Sao_Paulo" });
  const requestId = useRef<string | null>(null);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const selectedServices = useMemo(() => publicServices.filter((service) => serviceIds.includes(service.id)), [publicServices, serviceIds]);
  const selectedDuration = selectedServices.reduce((total, service) => total + service.durationMinutes, 0);
  const selectedPrice = selectedServices.reduce((total, service) => total + service.priceCents, 0);
  const selectedBarber = publicBarbers.find((barber) => barber.id === assignedBarberId || (barberId !== "any" && barber.id === barberId));
  const serviceKey = serviceIds.join(",");
  const eligibleBarbers = useMemo(() => publicBarbers.filter((barber) => barber.active && (!barber.serviceIds || serviceIds.every((serviceId) => barber.serviceIds?.includes(serviceId)))), [publicBarbers, serviceIds]);
  const timeGroups = useMemo(() => {
    const groups = new Map<string, AvailableTimeGroup>();
    for (const item of availableTimes) {
      const group = groups.get(item.iso) ?? { label: item.label, iso: item.iso, barbers: [] };
      if (!group.barbers.some((barber) => barber.id === item.barberId)) group.barbers.push({ id: item.barberId, name: item.barberName });
      groups.set(item.iso, group);
    }
    return [...groups.values()];
  }, [availableTimes]);
  const selectedTimeGroup = timeGroups.find((group) => group.iso === slotIso);

  useEffect(() => {
    if (!hasSupabaseEnv || !supabaseUrl || !supabasePublishableKey) return;
    fetch(`${supabaseUrl}/functions/v1/public-booking?slug=${encodeURIComponent(slug)}`, { headers: { apikey: supabasePublishableKey } })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((payload) => {
        setShop({ name: payload.shop.name, bookingMessage: payload.shop.booking_message ?? "", timezone: payload.shop.timezone ?? "America/Sao_Paulo" });
        setPublicServices(payload.services.map((item: { id: string; name: string; description: string | null; duration_minutes: number; price_cents: number }) => ({ id: item.id, name: item.name, description: item.description ?? "", durationMinutes: item.duration_minutes, priceCents: item.price_cents, active: true })));
        setPublicBarbers(payload.barbers.map((item: { id: string; display_name: string; color: string; avatar_url?: string | null; service_ids?: string[] }) => ({ id: item.id, name: item.display_name, avatarUrl: item.avatar_url ?? undefined, role: "Barbeiro", color: item.color, todayCount: 0, workingHours: "", active: true, serviceIds: item.service_ids ?? [] })));
      }).catch(() => setBookingError("A agenda pública está temporariamente indisponível."));
  }, [slug]);

  useEffect(() => {
    if (!serviceIds.length || !barberId || !selectedServices.length) {
      queueMicrotask(() => setAvailableTimes([]));
      return;
    }

    if (!hasSupabaseEnv || !supabaseUrl || !supabasePublishableKey) {
      queueMicrotask(() => {
        setAvailableTimes([]);
        setBookingError("O agendamento online está sendo conectado ao ambiente de produção.");
      });
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => setAvailabilityLoading(true));
    fetch(`${supabaseUrl}/functions/v1/public-booking`, { method: "POST", signal: controller.signal, headers: { apikey: supabasePublishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ action: "availability", slug, serviceIds, barberId, date: selectedDate }) })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((payload) => setAvailableTimes(payload.slots.map((item: { startsAt: string; barberId: string; barberName: string }) => ({ iso: item.startsAt, barberId: item.barberId, barberName: item.barberName, label: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: shop.timezone }).format(new Date(item.startsAt)) }))))
      .catch((error) => { if (error.name !== "AbortError") setBookingError("Não foi possível carregar os horários disponíveis."); })
      .finally(() => { if (!controller.signal.aborted) setAvailabilityLoading(false); });
    return () => controller.abort();
  }, [slug, serviceKey, serviceIds, barberId, selectedDate, selectedServices.length, shop.timezone]);

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedServices.length || !selectedBarber || !time) return;
    setSubmitting(true);
    setBookingError("");
    requestId.current ??= crypto.randomUUID();
    if (hasSupabaseEnv && supabaseUrl && supabasePublishableKey) {
      const response = await fetch(`${supabaseUrl}/functions/v1/public-booking`, { method: "POST", headers: { apikey: supabasePublishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ action: "book", slug, serviceIds, barberId: selectedBarber.id, startsAt: slotIso, client: customer, requestId: requestId.current }) });
      if (!response.ok) { setSubmitting(false); if (response.status === 409) requestId.current = null; setBookingError(response.status === 409 ? "Esse horário acabou de ser reservado ou conflita com outro agendamento seu. Escolha outro." : "Não foi possível concluir o agendamento."); return; }
      const payload = await response.json().catch(() => ({}));
      setEmailDelivered(payload.emailSent !== false);
      setSubmitting(false);
      setStep(5);
      return;
    }
    setSubmitting(false);
    requestId.current = null;
    setBookingError("O agendamento online está sendo conectado ao ambiente de produção.");
  }

  return <main className="booking-page">
    <header className="booking-header"><Link className="booking-brand" href={`/b/${slug}`}><span><Scissors /></span><strong>{shop.name}</strong></Link><div><ShieldCheck size={15} /> Link oficial de agendamento</div></header>
    <section className="booking-intro"><p className="eyebrow">{shop.name} · Agendamento oficial</p><h1>Escolha seu melhor horário.</h1><p>{shop.bookingMessage || "Veja a disponibilidade antes de informar seus dados. Sem cadastro obrigatório."}</p></section>
    {step <= 4 && <div className="booking-progress" aria-label={`Etapa ${step} de 4`}>{[1,2,3,4].map((item) => <span className={item <= step ? "is-active" : ""} key={item}><i>{item < step ? <Check size={13} /> : item}</i><small>{["Serviço","Profissional","Horário","Seus dados"][item-1]}</small></span>)}</div>}
    <section className="booking-card">
      {bookingError && <p className="form-feedback error">{bookingError}</p>}
      {step === 1 && <div className="booking-step"><div className="booking-step__head"><div><p className="eyebrow">Etapa 1</p><h2>Qual serviço você quer?</h2><p className="booking-step-note">Você pode combinar serviços. O horário será reservado pelo tempo total.</p></div></div><div className="booking-options">{publicServices.filter((service) => service.active).map((service) => { const selected = serviceIds.includes(service.id); return <button type="button" className={selected ? "is-selected" : ""} onClick={() => { setServiceIds((current) => selected ? current.filter((id) => id !== service.id) : [...current, service.id]); setBarberId(""); setAssignedBarberId(""); setTime(""); setSlotIso(""); setBookingError(""); }} key={service.id}><span className="booking-option-icon"><Scissors /></span><span><strong>{service.name}</strong><small><Clock3 /> {service.durationMinutes} min</small></span><b>{formatCurrency(service.priceCents)}</b>{selected && <i><Check /></i>}</button>; })}</div>{selectedServices.length > 0 && <div className="booking-selection-summary"><strong>{selectedServices.map((service) => service.name).join(" + ")}</strong><span>{selectedDuration} min · {formatCurrency(selectedPrice)}</span></div>}{publicServices.length === 0 && <p className="booking-step-note">Os serviços serão publicados em breve. Volte novamente quando a agenda estiver aberta.</p>}<button className="button primary booking-next" disabled={!serviceIds.length} onClick={() => setStep(2)}>Continuar <ChevronRight /></button></div>}
      {step === 2 && <div className="booking-step"><button className="booking-back" onClick={() => setStep(1)}><ArrowLeft /> Voltar</button><div className="booking-step__head"><div><p className="eyebrow">Etapa 2</p><h2>Com quem você prefere?</h2></div></div><div className="barber-options"><button className={barberId === "any" ? "is-selected" : ""} onClick={() => { setBarberId("any"); setAssignedBarberId(""); setTime(""); setSlotIso(""); }}><span className="public-avatar any"><UserRound /></span><span><strong>Escolher pelo horário</strong><small>Depois escolha entre todos que estiverem livres</small></span></button>{eligibleBarbers.map((barber) => <button className={barberId === barber.id ? "is-selected" : ""} onClick={() => { setBarberId(barber.id); setAssignedBarberId(barber.id); setTime(""); setSlotIso(""); }} key={barber.id}><BarberAvatar barber={barber} className="public-avatar" sizes="42px" /><span><strong>{barber.name}</strong><small>{barber.role}</small></span></button>)}</div><button className="button primary booking-next" disabled={!barberId} onClick={() => setStep(3)}>Continuar <ChevronRight /></button></div>}
      {step === 3 && <div className="booking-step"><button className="booking-back" onClick={() => setStep(2)}><ArrowLeft /> Voltar</button><div className="booking-step__head"><div><p className="eyebrow">Etapa 3</p><h2>Escolha data e horário</h2>{barberId === "any" && <p className="booking-step-note">Escolha um horário e mostraremos todos os profissionais livres nele.</p>}</div></div><div className="date-options">{bookingDates.map((day) => <button className={selectedDate === day.iso ? "is-selected" : ""} onClick={() => { setSelectedDate(day.iso); setTime(""); setSlotIso(""); setAssignedBarberId(barberId !== "any" ? barberId : ""); }} key={day.iso}><small>{day.weekday}</small><strong>{day.day}</strong></button>)}</div><p className="time-section-title"><Clock3 /> Horários disponíveis</p>{availabilityLoading ? <p className="booking-step-note">Consultando a agenda da equipe…</p> : timeGroups.length ? <div className="time-options">{timeGroups.map((group) => <button aria-label={`${group.label}, ${group.barbers.length} ${group.barbers.length === 1 ? "profissional livre" : "profissionais livres"}`} className={slotIso === group.iso ? "is-selected" : ""} onClick={() => { setTime(group.label); setSlotIso(group.iso); setAssignedBarberId(barberId !== "any" ? barberId : group.barbers.length === 1 ? group.barbers[0].id : ""); setBookingError(""); }} key={group.iso}><strong>{group.label}</strong>{barberId === "any" && <small>{group.barbers.length} {group.barbers.length === 1 ? "profissional" : "profissionais"}</small>}</button>)}</div> : <p className="booking-step-note">Não há horários livres nesta data. Escolha outro dia ou profissional.</p>}{barberId === "any" && selectedTimeGroup && <section className="slot-barber-picker" aria-labelledby="slot-barber-title"><div><p className="eyebrow">Disponíveis às {selectedTimeGroup.label}</p><h3 id="slot-barber-title">Com quem você quer cortar?</h3></div><div>{selectedTimeGroup.barbers.map((candidate) => { const barber = publicBarbers.find((item) => item.id === candidate.id); if (!barber) return null; return <button className={assignedBarberId === barber.id ? "is-selected" : ""} onClick={() => setAssignedBarberId(barber.id)} key={barber.id}><BarberAvatar barber={barber} className="public-avatar" sizes="42px" /><span><strong>{barber.name}</strong><small>{assignedBarberId === barber.id ? "Selecionado" : "Livre neste horário"}</small></span>{assignedBarberId === barber.id && <CheckCircle2 />}</button>; })}</div></section>}{barberId === "any" && time && selectedBarber && <p className="booking-step-note"><CheckCircle2 size={16} /> Você escolheu {selectedBarber.name} para {time}.</p>}<button className="button primary booking-next" disabled={!time || !assignedBarberId} onClick={() => setStep(4)}>Continuar <ChevronRight /></button></div>}
      {step === 4 && <form className="booking-step" onSubmit={finish}><button type="button" className="booking-back" onClick={() => setStep(3)}><ArrowLeft /> Voltar</button><div className="booking-step__head"><div><p className="eyebrow">Etapa 4</p><h2>Confirme seus dados</h2><p className="booking-step-note">Só agora pedimos o necessário para enviar a confirmação e evitar reservas duplicadas.</p></div></div><div className="booking-summary"><div><Scissors /><span><small>Serviços</small><strong>{selectedServices.map((service) => service.name).join(" + ")}</strong></span></div><div><UserRound /><span><small>Profissional</small><strong>{selectedBarber?.name}</strong></span></div><div><CalendarDays /><span><small>Quando</small><strong>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`))} · {time}</strong></span></div><b>{formatCurrency(selectedPrice)}</b></div><div className="form-grid"><label className="field full"><span>Nome completo</span><input required minLength={2} autoComplete="name" value={customer.name} onChange={(e) => setCustomer({...customer,name:e.target.value})} /></label><label className="field"><span>E-mail para confirmação</span><input type="email" required autoComplete="email" value={customer.email} onChange={(e) => setCustomer({...customer,email:e.target.value})} /></label><label className="field"><span>WhatsApp (opcional)</span><input type="tel" autoComplete="tel" value={customer.phone} onChange={(e) => setCustomer({...customer,phone:e.target.value})} /></label></div><p className="booking-privacy"><ShieldCheck /> Usaremos os dados somente para este atendimento e lembretes operacionais. Você poderá confirmar ou cancelar pelo link seguro.</p><button className="button primary booking-next" disabled={submitting}>{submitting ? "Protegendo seu horário…" : <>Confirmar agendamento <CheckCircle2 /></>}</button></form>}
      {step === 5 && <div className="booking-success"><span><CheckCircle2 /></span><p className="eyebrow">Tudo certo</p><h2>Agendamento confirmado!</h2>{emailDelivered ? <p>Enviamos os detalhes para <strong>{customer.email}</strong>. Você poderá confirmar ou cancelar pelo link seguro no e-mail — sem senha e sem criar conta.</p> : <p>Seu horário está reservado, mas o e-mail não pôde ser enviado agora. Guarde esta tela e, se precisar, fale com a barbearia para confirmar os detalhes.</p>}<div className="success-ticket"><div><small>Serviços</small><strong>{selectedServices.map((service) => service.name).join(" + ")}</strong></div><div><small>Profissional</small><strong>{selectedBarber?.name}</strong></div><div><small>Duração total</small><strong>{selectedDuration} min · {bookingDates.find((day) => day.iso === selectedDate)?.day} · {time}</strong></div></div><button className="button subtle" onClick={() => { requestId.current = null; setStep(1); setServiceIds([]); setBarberId(""); setAssignedBarberId(""); setTime(""); setSlotIso(""); setEmailDelivered(true); }}>Fazer outro agendamento</button></div>}
    </section>
    <footer className="booking-footer"><ShieldCheck /> Seus dados são usados somente para administrar este agendamento.</footer>
  </main>;
}

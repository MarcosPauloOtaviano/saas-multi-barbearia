"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AtSign, Clock3, ExternalLink, MapPin, Phone, Scissors, Sparkles, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BarberAvatar } from "@/components/barber-avatar";
import { formatCurrency } from "@/lib/format";
import type { Barber, Service } from "@/lib/types";
import type { PublicShop } from "@/lib/use-public-shop";

export function CustomerHome({ slug, shop, shopName, services, barbers }: { slug: string; shop?: PublicShop | null; shopName?: string; services: Service[]; barbers: Barber[] }) {
  const allActiveServices = services.filter((service) => service.active);
  const activeServices = allActiveServices.slice(0, 3);
  const activeBarbers = barbers.filter((barber) => barber.active);
  const bookingHref = `/b/${slug}/agendar`;
  const servicesHref = `/b/${slug}/servicos`;
  const name = shop?.name ?? shopName ?? "Sua barbearia";
  const mapHref = shop?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}` : null;
  const heroRef = useRef<HTMLElement>(null);
  const [sceneProgress, setSceneProgress] = useState(0);
  const scenes = [
    { image: "/images/barberflow-scene-00-aerea.png", focus: "52% center" },
    { image: "/images/barberflow-scene-01-aproximacao.png", focus: "52% center" },
    { image: "/images/barberflow-scene-03-porta.png", focus: "52% center" },
    { image: "/images/barberflow-scene-02-semi-realista.png", focus: "52% center" },
    { image: "/images/barberflow-scene-03-semi-realista.png", focus: "78% center" },
  ];
  const sceneIndex = Math.min(scenes.length - 1, Math.floor(sceneProgress * scenes.length));

  useEffect(() => {
    function updateScene() {
      const hero = heroRef.current;
      if (!hero) return;
      const range = Math.max(hero.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(0.999, Math.max(0, (window.scrollY - hero.offsetTop) / range));
      setSceneProgress(progress);
    }
    updateScene();
    window.addEventListener("scroll", updateScene, { passive: true });
    window.addEventListener("resize", updateScene);
    return () => {
      window.removeEventListener("scroll", updateScene);
      window.removeEventListener("resize", updateScene);
    };
  }, []);

  return <div className="customer-home">
    <section className="customer-cinematic-hero cinematic-hero-shell" ref={heroRef} aria-labelledby="customer-professional-title">
      <div className="cinematic-hero">
        <div className="cinematic-hero__media-stack" aria-hidden="true">
          {scenes.map((item, index) => {
            const center = index / (scenes.length - 1);
            const distance = Math.abs(sceneProgress - center);
            const opacity = Math.max(0, 1 - distance * 2.55);
            const scale = 1.04 + index * 0.06 + sceneProgress * (index === 0 ? 0.06 : 0.12);
            const x = index === 0 ? sceneProgress * -2 : index === 1 ? (sceneProgress - 0.25) * -3 : index === 2 ? (sceneProgress - 0.5) * -2 : index === 3 ? (sceneProgress - 0.75) * -2 : (sceneProgress - 1) * -2;
            return <div className="cinematic-hero__media" key={item.image} style={{ opacity, transform: `scale(${scale}) translate3d(${x}%, ${sceneProgress * -2.5}%, 0)`, ["--scene-focus" as string]: item.focus }}><Image src={item.image} alt="" fill priority={index === 0} sizes="100vw" /></div>;
          })}
        </div>
        <div className="cinematic-hero__veil" />
        <div className="cinematic-hero__grain" />
        <div className="cinematic-hero__copy">
          <p className="cinematic-kicker"><span /> {name} · Agendamento oficial</p>
          <h1 id="customer-professional-title">Seu próximo corte<br /><em>começa aqui.</em></h1>
          <p className="cinematic-hero__lead">Escolha o serviço, o profissional e um horário disponível. Sem cadastro obrigatório e com confirmação segura.</p>
          <div className="cinematic-hero__actions"><Link className="button cinematic-button" href={bookingHref}><span>Agendar meu horário</span><ArrowRight /></Link><Link className="cinematic-login" href={servicesHref}>Ver serviços <ArrowRight /></Link></div>
        </div>
        <div className="cinematic-progress" aria-label={`Progresso da apresentação: cena ${sceneIndex + 1} de ${scenes.length}`}><span style={{ transform: `scaleX(${Math.max(0.04, sceneProgress)})` }} /></div>
        <a className="cinematic-scroll" href="#customer-services" aria-label="Rolar para ver os serviços"><span>Deslize para entrar</span><i /></a>
      </div>
    </section>

    <section className="customer-section" id="customer-services">
      <div className="customer-section-head"><div><p className="eyebrow">Serviços</p><h2>Escolha seu atendimento</h2></div><Link href={servicesHref}>Ver todos</Link></div>
      {activeServices.length ? <div className="customer-service-scroll">{activeServices.map((service, index) => <Link className="customer-service-card" href={`${bookingHref}?service=${service.id}`} key={service.id}><span className={`customer-service-icon tone-${index + 1}`}><Scissors /></span><strong>{service.name}</strong><small><Clock3 /> {service.durationMinutes} min</small><b>{formatCurrency(service.priceCents)}</b></Link>)}</div> : <p className="customer-empty-copy">Os serviços serão publicados quando a agenda estiver aberta.</p>}
    </section>

    <section className="customer-section">
      <div className="customer-section-head"><div><p className="eyebrow">Equipe</p><h2>Escolha seu profissional</h2></div></div>
      <div className="customer-team-row">{activeBarbers.map((barber) => <article key={barber.id}><BarberAvatar barber={barber} className="customer-team-avatar" sizes="40px" /><div><strong>{barber.name}</strong><small>{barber.role}</small></div><Link href={bookingHref} aria-label={`Agendar com ${barber.name}`}><ArrowRight /></Link></article>)}</div>
    </section>

    {(shop?.address || shop?.phone || shop?.websiteUrl || shop?.instagramUrl || shop?.googleReviewsUrl) && <section className="customer-contact" aria-labelledby="customer-contact-title"><div><p className="eyebrow">{name}</p><h2 id="customer-contact-title">Contato</h2></div><div className="customer-contact__links">{shop.address && <a href={mapHref ?? "#"} target="_blank" rel="noreferrer"><span><MapPin /></span><strong>{shop.address}</strong><ExternalLink /></a>}{shop.phone && <a href={`tel:${shop.phone.replace(/\D/g, "")}`}><span><Phone /></span><strong>{shop.phone}</strong><ArrowRight /></a>}{shop.instagramUrl && <a href={shop.instagramUrl} target="_blank" rel="noreferrer"><span><AtSign /></span><strong>Instagram de {name}</strong><ExternalLink /></a>}{shop.websiteUrl && <a href={shop.websiteUrl} target="_blank" rel="noreferrer"><span><Scissors /></span><strong>Site oficial</strong><ExternalLink /></a>}{shop.googleReviewsUrl && <a href={shop.googleReviewsUrl} target="_blank" rel="noreferrer"><span><Star /></span><strong>{shop.googleReviewCount ? `${shop.googleReviewCount} avaliações no Google` : "Avaliações no Google"}</strong><ExternalLink /></a>}</div></section>}

    <footer className="customer-footer"><div><Sparkles /><span><strong>{name}</strong><small>Agendamento oficial</small></span></div><div className="customer-footer__links"><Link href="/privacidade">Política de privacidade</Link><Link href="/termos">Termos de uso</Link></div></footer>
  </div>;
}

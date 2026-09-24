"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarCheck2, Scissors, ShieldCheck, Store, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const whatsappHref = `https://wa.me/5535988440656?text=${encodeURIComponent("Olá! Quero conhecer o BarberFlow e cadastrar meu estabelecimento.")}`;

const scenes = [
  { eyebrow: "01 / Na rua", title: "A agenda começa antes da porta.", copy: "Uma experiência bonita para quem chega pelo celular e quer resolver o horário sem perder tempo.", image: "/images/barberflow-scene-01.png" },
  { eyebrow: "02 / Na entrada", title: "O cliente encontra o seu lugar.", copy: "Cada estabelecimento tem seu próprio endereço, equipe, serviços e agenda — sem misturar operações.", image: "/images/barberflow-scene-02.png" },
  { eyebrow: "03 / No corte", title: "E a equipe cuida do resto.", copy: "Horários, profissionais, clientes e rotina organizados em um painel simples para o dia a dia.", image: "/images/barberflow-scene-03.png" },
];

export function PlatformHome() {
  const heroRef = useRef<HTMLElement>(null);
  const [sceneProgress, setSceneProgress] = useState(0);
  const sceneIndex = Math.min(scenes.length - 1, Math.floor(sceneProgress * scenes.length));
  const scene = scenes[sceneIndex];
  const sceneFocus = ["28% center", "52% center", "78% center"];

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

  return <main className="platform-home platform-home--cinematic">
    <header className="platform-nav">
      <Link className="platform-wordmark" href="/" aria-label="BarberFlow, página inicial"><span><Scissors /></span><strong>BarberFlow</strong></Link>
      <nav aria-label="Navegação principal">
        <a href="#como-funciona">Como funciona</a>
        <Link className="platform-nav__login" href="/admin">Acessar painel <ArrowUpRight /></Link>
      </nav>
    </header>

    <section className="cinematic-hero-shell" ref={heroRef}>
      <div className="cinematic-hero" aria-labelledby="platform-title">
        <div className="cinematic-hero__media-stack" aria-hidden="true">
          {scenes.map((item, index) => {
            const center = index / (scenes.length - 1);
            const distance = Math.abs(sceneProgress - center);
            const opacity = Math.max(0, 1 - distance * 2.55);
            const scale = 1.04 + index * 0.06 + sceneProgress * (index === 0 ? 0.06 : 0.12);
            const x = index === 0 ? sceneProgress * -2 : index === 1 ? (sceneProgress - 0.5) * -3 : (sceneProgress - 1) * -2;
            return <div className="cinematic-hero__media" key={item.eyebrow} style={{ opacity, transform: `scale(${scale}) translate3d(${x}%, ${sceneProgress * -2.5}%, 0)`, ["--scene-focus" as string]: sceneFocus[index] }}>
              <Image src={item.image} alt="" fill priority={index === 0} sizes="100vw" />
            </div>;
          })}
        </div>
        <div className="cinematic-hero__veil" />
        <div className="cinematic-hero__grain" />

        <div className="cinematic-hero__copy">
          <p className="cinematic-kicker"><span /> A agenda que entra com você</p>
          <h1 id="platform-title">Seu negócio<br /><em>começa na rua.</em></h1>
          <p className="cinematic-hero__lead">O BarberFlow transforma o primeiro clique em uma experiência de verdade — da calçada ao corte, com tudo no lugar.</p>
          <div className="cinematic-hero__actions">
            <a className="button cinematic-button" href={whatsappHref} target="_blank" rel="noreferrer"><span>Quero cadastrar minha barbearia</span><ArrowUpRight /></a>
            <Link className="cinematic-login" href="/admin">Já tenho acesso <ArrowRight /></Link>
          </div>
          <p className="cinematic-contact">Fale direto com a gente pelo WhatsApp <strong>+55 35 98844-0656</strong></p>
        </div>

        <div className="cinematic-story" aria-live="polite">
          <div className="cinematic-story__line"><span style={{ transform: `scaleY(${Math.max(0.08, sceneProgress)})` }} /></div>
          <div className="cinematic-story__copy"><p>{scene.eyebrow}</p><h2>{scene.title}</h2><span>{scene.copy}</span></div>
          <div className="cinematic-story__steps" aria-label="Etapas da experiência">
            {scenes.map((item, index) => <span className={sceneIndex === index ? "is-active" : ""} key={item.eyebrow}><i>{String(index + 1).padStart(2, "0")}</i>{item.eyebrow.replace(/^\d+ \/ /, "")}</span>)}
          </div>
        </div>
        <a className="cinematic-scroll" href="#como-funciona" aria-label="Rolar para ver como funciona"><span>Deslize para entrar</span><i /></a>
      </div>
    </section>

    <section className="platform-story" id="como-funciona">
      <div className="platform-story__intro"><p className="eyebrow">Uma operação mais leve</p><h2>Seu cliente sente a diferença antes mesmo de sentar.</h2><p>O BarberFlow cuida do caminho inteiro: o cliente agenda sem senha, o barbeiro enxerga seu dia e o dono mantém o controle do estabelecimento.</p></div>
      <div className="platform-story__grid">
        <article><span><Store /></span><strong>Seu endereço, sua marca</strong><p>Uma página própria para cada barbearia, com serviços, profissionais, fotos e horários.</p></article>
        <article><span><CalendarCheck2 /></span><strong>Agendamento sem atrito</strong><p>O cliente escolhe o serviço, o barbeiro e o melhor horário sem criar conta.</p></article>
        <article><span><ShieldCheck /></span><strong>Equipe sob controle</strong><p>O painel separa permissões e agendas para cada pessoa da operação.</p></article>
      </div>
    </section>

    <section className="platform-contact-cta">
      <div><p className="eyebrow">Quer levar isso para o seu negócio?</p><h2>Vamos abrir a porta da sua barbearia.</h2><p>Chame no WhatsApp e conte como é o seu estabelecimento. A gente mostra o próximo passo.</p></div>
      <a className="button cinematic-button" href={whatsappHref} target="_blank" rel="noreferrer">Falar no WhatsApp <ArrowUpRight /></a>
    </section>

    <footer className="platform-footer"><div><span className="platform-wordmark"><span><Scissors /></span><strong>BarberFlow</strong></span><small>Agenda para barbearias que querem ser lembradas.</small></div><div className="platform-footer__links"><Link href="/admin">Painel da equipe</Link><a href={whatsappHref} target="_blank" rel="noreferrer">Cadastrar estabelecimento</a></div><UsersRound /></footer>
  </main>;
}

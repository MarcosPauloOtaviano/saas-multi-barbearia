"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Scissors } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const whatsappHref = `https://wa.me/5535988440656?text=${encodeURIComponent("Olá! Quero conhecer o BarberFlow e cadastrar meu estabelecimento.")}`;

const scenes = [
  { eyebrow: "01 / Na rua", title: "Encontre seu horário.", copy: "Uma entrada simples para quem chega pelo celular.", image: "/images/barberflow-scene-01.png" },
  { eyebrow: "02 / Na entrada", title: "Sua marca em destaque.", copy: "Cada estabelecimento tem seu próprio espaço.", image: "/images/barberflow-scene-02.png" },
  { eyebrow: "03 / No corte", title: "A agenda no lugar.", copy: "Cliente e equipe enxergam só o que importa.", image: "/images/barberflow-scene-03.png" },
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
          <p className="cinematic-kicker"><span /> BarberFlow · Agendamento simples</p>
          <h1 id="platform-title">Sua agenda<br /><em>começa aqui.</em></h1>
          <p className="cinematic-hero__lead">Uma página clara para o cliente agendar e para sua equipe organizar o dia.</p>
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
        <a className="cinematic-scroll" href="#contato" aria-label="Rolar para ver contato"><span>Deslize para entrar</span><i /></a>
      </div>
    </section>

    <section className="platform-contact-cta" id="contato">
      <div><p className="eyebrow">Contato</p><h2>Quer cadastrar seu estabelecimento?</h2><p>Fale com o BarberFlow pelo WhatsApp: <strong>+55 35 98844-0656</strong>.</p></div>
      <a className="button cinematic-button" href={whatsappHref} target="_blank" rel="noreferrer">Falar no WhatsApp <ArrowUpRight /></a>
    </section>

    <footer className="platform-footer"><div><span className="platform-wordmark"><span><Scissors /></span><strong>BarberFlow</strong></span><small>Agendamento para barbearias.</small></div><div className="platform-footer__links"><Link href="/admin">Acessar painel</Link><Link href="/privacidade">Privacidade e LGPD</Link><Link href="/termos">Termos de uso</Link></div></footer>
  </main>;
}

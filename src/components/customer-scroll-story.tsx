"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, CalendarCheck2, Crown, MousePointer2, Scissors, Sparkles, UserRound } from "lucide-react";

const scenes = [
  { eyebrow: "Seu momento", title: "O próximo corte começa no seu ritmo.", body: "Uma experiência rápida, visual e sem cadastro obrigatório para encontrar o horário certo.", icon: Scissors },
  { eyebrow: "Seu atendimento", title: "Escolha o serviço que combina com você.", body: "Veja duração, valor e os detalhes antes de decidir — sem surpresas no final.", icon: Sparkles },
  { eyebrow: "Seu profissional", title: "Chegue sabendo quem vai cuidar do seu estilo.", body: "Selecione o barbeiro ou encontre o primeiro horário livre entre a equipe.", icon: Crown },
];

function sceneStyle(progress: number, index: number): CSSProperties {
  const focus = progress * (scenes.length - 1);
  const distance = Math.abs(focus - index);
  const opacity = Math.max(0, 1 - distance * 1.7);
  const offset = (index - focus) * 18;
  return {
    opacity,
    transform: `translate3d(${offset}%, 0, 0) scale(${1 - Math.min(distance * 0.045, 0.08)})`,
    zIndex: Math.round((1 - distance) * 10),
    pointerEvents: opacity > 0.5 ? "auto" : "none",
  };
}

export function CustomerScrollStory({ bookingHref, shopName }: { bookingHref: string; shopName: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section) return;
      const scrollable = Math.max(section.offsetHeight - window.innerHeight, 1);
      const next = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / scrollable));
      setProgress(next);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  const activeScene = Math.min(scenes.length - 1, Math.round(progress * (scenes.length - 1)));

  return <section className="customer-story" ref={sectionRef} aria-labelledby="customer-story-title">
    <div className="customer-story__sticky">
      <div className="customer-story__intro">
        <p className="eyebrow">Uma nova forma de agendar</p>
        <h2 id="customer-story-title">Seu estilo merece uma experiência à altura.</h2>
        <p>Role para conhecer o atendimento da {shopName} antes de escolher seu horário.</p>
      </div>
      <div className="customer-story__stage">
        <div className="customer-story__copy" aria-live="polite">
          <div className="customer-story__step-count"><span>0{activeScene + 1}</span><i /> <small>0{scenes.length}</small></div>
          {scenes.map((scene, index) => { const Icon = scene.icon; return <article className="customer-story__scene-copy" key={scene.eyebrow} style={sceneStyle(progress, index)} aria-hidden={activeScene !== index}>
            <div className="customer-story__icon"><Icon /></div>
            <p className="eyebrow">{scene.eyebrow}</p>
            <h3>{scene.title}</h3>
            <p>{scene.body}</p>
            {index === scenes.length - 1 && <Link href={bookingHref}>Encontrar meu horário <ArrowRight /></Link>}
          </article>; })}
        </div>
        <div className="customer-story__viewport" aria-hidden="true">
          <div className="customer-story__browser-bar"><span /><span /><span /><small>agendamento oficial</small></div>
          {scenes.map((scene, index) => <div className={`customer-story__screen customer-story__screen--${index + 1}`} key={scene.eyebrow} style={sceneStyle(progress, index)}>
            {index === 0 && <div className="story-screen__hero"><span>{shopName}</span><strong>ONDE<br />SEU ESTILO<br />VIVE</strong><small>agendamento oficial</small></div>}
            {index === 1 && <div className="story-screen__services"><p>Escolha seu atendimento</p><strong>Serviços pensados<br />para o seu estilo.</strong><div><span>Atendimento escolhido <b>à sua medida</b></span><span>Detalhes transparentes <b>sem surpresa</b></span><span>Experiência Stilo <b>do seu jeito</b></span></div></div>}
            {index === 2 && <div className="story-screen__team"><p>Seu profissional</p><strong>Quem vai cuidar<br />do seu próximo visual?</strong><div><span><i><UserRound /></i> Profissional <b>Disponível</b></span><span><i><CalendarCheck2 /></i> Escolha um horário <b>Agora</b></span></div></div>}
          </div>)}
          <div className="customer-story__grain" />
        </div>
      </div>
      <div className="customer-story__scroll-cue"><MousePointer2 /><span>Continue rolando</span><ArrowDown /></div>
    </div>
  </section>;
}

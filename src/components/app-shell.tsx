"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, CalendarDays, ChevronDown, House, LogOut, Scissors, Settings, UserRoundCog, UsersRound, Menu, X, Package, Clock, UserRound } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { signOut } from "@/app/auth/actions";
import type { MemberRole } from "@/lib/types";
import { initials } from "@/lib/format";

const navigation = [
  { path: "", label: "Início", icon: House, roles: ["owner", "manager", "barber", "receptionist"] },
  { path: "/agenda", label: "Agenda", icon: CalendarDays, roles: ["owner", "manager", "barber", "receptionist"] },
  { path: "/clientes", label: "Clientes", icon: UsersRound, roles: ["owner", "manager", "receptionist"] },
  { path: "/servicos", label: "Serviços", icon: Scissors, roles: ["owner", "manager"] },
  { path: "/produtos", label: "Produtos", icon: Package, roles: ["owner", "manager"] },
  { path: "/horarios", label: "Funcionamento", icon: Clock, roles: ["owner", "manager"] },
  { path: "/perfil", label: "Meu perfil", icon: UserRound, roles: ["owner", "manager", "barber", "receptionist"] },
  { path: "/equipe", label: "Equipe", icon: UserRoundCog, roles: ["owner", "manager"] },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["owner", "manager"] },
  { path: "/notificacoes", label: "Avisos", icon: Bell, roles: ["owner", "manager", "barber", "receptionist"] },
  { path: "/configuracoes", label: "Ajustes", icon: Settings, roles: ["owner", "manager"] },
];

const roleLabels: Record<MemberRole, string> = { owner: "Proprietário", manager: "Gerente", barber: "Barbeiro", receptionist: "Recepcionista" };

export function AppShell({ children, slug }: { children: React.ReactNode; slug: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const base = `/admin/${slug}`;
  const { notifications, role, currentUserName, shopName, loading, loadError } = useAppData();
  const unread = notifications.filter((note) => !note.read).length;
  const allowedNavigation = navigation.filter((item) => item.roles.includes(role));
  const isCurrent = (path: string) => path === "" ? pathname === base : pathname.startsWith(`${base}${path}`);
  const routeAllowed = allowedNavigation.some((item) => isCurrent(item.path));
  const userInitials = initials(currentUserName);
  const todayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const logoutAction = signOut.bind(null, slug);

  if (loading) return <main className="auth-shell"><p role="status">Carregando sua barbearia…</p></main>;
  if (loadError) return <main className="auth-shell"><section><h1>Não foi possível abrir o painel</h1><p role="alert">{loadError}</p><button className="button primary" onClick={() => window.location.reload()}>Tentar novamente</button><form action={logoutAction}><button className="button ghost">Sair</button></form></section></main>;

  return <main className="app-frame">
    <aside className="desktop-rail desktop-rail--full" aria-label="Navegação principal">
      <div className="rail-brand"><Link className="brand-mark" href={base} aria-label={`${shopName} — painel da equipe`}><Scissors size={23} strokeWidth={2.2} /></Link><div><strong>{shopName}</strong><small>Painel da equipe</small></div></div>
      <nav className="rail-nav rail-nav--full">{allowedNavigation.map(({ path, label, icon: Icon }) => <Link className={`rail-link ${isCurrent(path) ? "is-active" : ""}`} href={`${base}${path}`} aria-label={label} title={label} key={path}><Icon /><span>{label}</span>{label === "Avisos" && unread > 0 && <b className="rail-badge">{unread}</b>}</Link>)}</nav>
      <details className="profile-menu rail-profile"><summary className="avatar-button">{userInitials}</summary><div className="profile-popover"><strong>{currentUserName}</strong><span>{roleLabels[role]}</span>{(role === "owner" || role === "manager") && <Link href={`${base}/configuracoes`}><Settings size={16} /> Configurações</Link>}<form action={logoutAction}><button type="submit"><LogOut size={16} /> Sair</button></form></div></details>
    </aside>

    <section className="workspace app-workspace">
      <header className="topbar app-topbar"><Link className="mobile-wordmark" href={base}><Scissors size={18} /> {shopName} <small>Equipe</small></Link><div className="topbar-date"><p className="eyebrow">{todayLabel}</p><span>{shopName}</span></div><div className="topbar-actions"><Link className="customer-preview-link" href={`/b/${slug}`}><UserRoundCog size={13} /> Página pública</Link><Link className="notification-button" href={`${base}/notificacoes`} aria-label={`${unread} novas notificações`}><Bell size={20} />{unread > 0 && <span>{unread}</span>}</Link><details className="profile-menu header-profile"><summary><span className="header-avatar">{userInitials}</span><span className="header-user">{currentUserName}<small>{roleLabels[role]}</small></span><ChevronDown size={16} /></summary><div className="profile-popover"><strong>{currentUserName}</strong><span>{roleLabels[role]}</span>{(role === "owner" || role === "manager") && <Link href={`${base}/configuracoes`}><Settings size={16} /> Configurações</Link>}<form action={logoutAction}><button type="submit"><LogOut size={16} /> Sair</button></form></div></details></div></header>
      {routeAllowed ? children : <section className="content-card access-card"><UserRoundCog /><div><p className="eyebrow">Acesso protegido</p><h1>Esta área não faz parte do seu perfil</h1><p>O perfil de {roleLabels[role].toLowerCase()} vê somente as funções necessárias para o trabalho.</p><Link className="button primary" href={`${base}/agenda`}>Abrir minha agenda</Link></div></section>}
    </section>

    <nav className="mobile-nav operation-nav" aria-label="Navegação principal"><Link href={base} className={isCurrent("") ? "is-active" : ""}><House /><span>Início</span></Link><Link href={`${base}/agenda`} className={isCurrent("/agenda") ? "is-active" : ""}><CalendarDays /><span>Agenda</span></Link><Link href={`${base}/perfil`} className={isCurrent("/perfil") ? "is-active" : ""}><UserRound /><span>Meu perfil</span></Link><button onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="mobile-menu"><Menu /><span>Mais</span></button></nav>
    {menuOpen && <div className="modal-backdrop"><section className="modal-card mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title"><div className="modal-header"><h2 id="mobile-menu-title">{shopName}</h2><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X /></button></div><nav>{allowedNavigation.map(({path,label,icon:Icon}) => <Link key={path} href={`${base}${path}`} onClick={() => setMenuOpen(false)}><Icon size={20}/>{label}</Link>)}</nav><form action={logoutAction}><button className="button ghost"><LogOut size={18}/>Sair da conta</button></form></section></div>}
  </main>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-title__action">{action}</div>}</div>;
}

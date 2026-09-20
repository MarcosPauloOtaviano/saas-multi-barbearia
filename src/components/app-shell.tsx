"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, CalendarDays, ChevronDown, House, LogOut, Scissors, Settings, UserRoundCog, UsersRound } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { signOut } from "@/app/auth/actions";
import type { MemberRole } from "@/lib/types";
import { initials } from "@/lib/format";

const navigation = [
  { path: "", label: "Início", icon: House, roles: ["owner", "manager", "barber", "receptionist"] },
  { path: "/agenda", label: "Agenda", icon: CalendarDays, roles: ["owner", "manager", "barber", "receptionist"] },
  { path: "/clientes", label: "Clientes", icon: UsersRound, roles: ["owner", "manager", "receptionist"] },
  { path: "/servicos", label: "Serviços", icon: Scissors, roles: ["owner", "manager"] },
  { path: "/equipe", label: "Equipe", icon: UserRoundCog, roles: ["owner", "manager"] },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["owner", "manager"] },
  { path: "/notificacoes", label: "Avisos", icon: Bell, roles: ["owner", "manager", "barber", "receptionist"] },
  { path: "/configuracoes", label: "Ajustes", icon: Settings, roles: ["owner", "manager"] },
];

const roleLabels: Record<MemberRole, string> = { owner: "Proprietário", manager: "Gerente", barber: "Barbeiro", receptionist: "Recepcionista" };

export function AppShell({ children, slug }: { children: React.ReactNode; slug: string }) {
  const pathname = usePathname();
  const base = `/admin/${slug}`;
  const { notifications, role, currentUserName, shopName } = useAppData();
  const unread = notifications.filter((note) => !note.read).length;
  const allowedNavigation = navigation.filter((item) => item.roles.includes(role));
  const mobileNavigation = allowedNavigation.filter((item) => ["", "/agenda", "/clientes", "/notificacoes"].includes(item.path)).slice(0, 4);
  const isCurrent = (path: string) => path === "" ? pathname === base : pathname.startsWith(`${base}${path}`);
  const routeAllowed = allowedNavigation.some((item) => isCurrent(item.path));
  const userInitials = initials(currentUserName);
  const todayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const logoutAction = signOut.bind(null, slug);

  return <main className="app-frame">
    <aside className="desktop-rail desktop-rail--full" aria-label="Navegação principal">
      <Link className="brand-mark" href={base} aria-label={`${shopName} — painel da equipe`}><Scissors size={23} strokeWidth={2.2} /></Link>
      <nav className="rail-nav rail-nav--full">{allowedNavigation.map(({ path, label, icon: Icon }) => <Link className={`rail-link ${isCurrent(path) ? "is-active" : ""}`} href={`${base}${path}`} aria-label={label} title={label} key={path}><Icon />{label === "Avisos" && unread > 0 && <span className="rail-badge">{unread}</span>}</Link>)}</nav>
      <details className="profile-menu rail-profile"><summary className="avatar-button">{userInitials}</summary><div className="profile-popover"><strong>{currentUserName}</strong><span>{roleLabels[role]}</span>{(role === "owner" || role === "manager") && <Link href={`${base}/configuracoes`}><Settings size={16} /> Configurações</Link>}<form action={logoutAction}><button type="submit"><LogOut size={16} /> Sair</button></form></div></details>
    </aside>

    <section className="workspace app-workspace">
      <header className="topbar app-topbar"><Link className="mobile-wordmark" href={base}><Scissors size={18} /> {shopName} <small>Equipe</small></Link><div className="topbar-date"><p className="eyebrow">{todayLabel}</p><span>{shopName}</span></div><div className="topbar-actions"><Link className="customer-preview-link" href={`/b/${slug}`}><UserRoundCog size={13} /> Página pública</Link><Link className="notification-button" href={`${base}/notificacoes`} aria-label={`${unread} novas notificações`}><Bell size={20} />{unread > 0 && <span>{unread}</span>}</Link><details className="profile-menu header-profile"><summary><span className="header-avatar">{userInitials}</span><span className="header-user">{currentUserName}<small>{roleLabels[role]}</small></span><ChevronDown size={16} /></summary><div className="profile-popover"><strong>{currentUserName}</strong><span>{roleLabels[role]}</span>{(role === "owner" || role === "manager") && <Link href={`${base}/configuracoes`}><Settings size={16} /> Configurações</Link>}<form action={logoutAction}><button type="submit"><LogOut size={16} /> Sair</button></form></div></details></div></header>
      {routeAllowed ? children : <section className="content-card access-card"><UserRoundCog /><div><p className="eyebrow">Acesso protegido</p><h1>Esta área não faz parte do seu perfil</h1><p>O perfil de {roleLabels[role].toLowerCase()} vê somente as funções necessárias para o trabalho.</p><Link className="button primary" href={`${base}/agenda`}>Abrir minha agenda</Link></div></section>}
    </section>

    <nav className={`mobile-nav ${mobileNavigation.length < 4 ? "is-compact" : ""}`} aria-label="Navegação principal">{mobileNavigation.slice(0, 2).map(({ path, label, icon: Icon }) => <Link className={isCurrent(path) ? "is-active" : ""} href={`${base}${path}`} key={path}><Icon /><span>{label}</span></Link>)}<Link className="mobile-create" href={`${base}/agenda?novo=1`} aria-label="Novo agendamento"><span>+</span></Link>{mobileNavigation.slice(2, 4).map(({ path, label, icon: Icon }) => <Link className={isCurrent(path) ? "is-active" : ""} href={`${base}${path}`} key={path}><Icon /><span>{label}</span>{label === "Avisos" && unread > 0 && <b>{unread}</b>}</Link>)}</nav>
  </main>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-title__action">{action}</div>}</div>;
}

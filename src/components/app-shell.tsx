"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  House,
  LogOut,
  Scissors,
  Settings,
  Sparkles,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { signOut } from "@/app/auth/actions";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { MemberRole } from "@/lib/types";
import { initials } from "@/lib/format";

const navigation = [
  { href: "/admin", label: "Início", icon: House, roles: ["owner", "manager", "barber", "receptionist"] },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, roles: ["owner", "manager", "barber", "receptionist"] },
  { href: "/clientes", label: "Clientes", icon: UsersRound, roles: ["owner", "manager", "receptionist"] },
  { href: "/servicos", label: "Serviços", icon: Scissors, roles: ["owner", "manager"] },
  { href: "/equipe", label: "Equipe", icon: UserRoundCog, roles: ["owner", "manager"] },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["owner", "manager"] },
  { href: "/notificacoes", label: "Avisos", icon: Bell, roles: ["owner", "manager", "barber", "receptionist"] },
  { href: "/configuracoes", label: "Ajustes", icon: Settings, roles: ["owner", "manager"] },
];

const roleLabels: Record<MemberRole, string> = { owner: "Proprietário", manager: "Gerente", barber: "Barbeiro", receptionist: "Recepcionista" };

function isCurrent(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { notifications, role, setRole } = useDemo();
  const unread = notifications.filter((note) => !note.read).length;
  const allowedNavigation = navigation.filter((item) => item.roles.includes(role));
  const mobileNavigation = allowedNavigation.filter((item) => ["/admin", "/agenda", "/clientes", "/notificacoes"].includes(item.href)).slice(0, 4);
  const routeAllowed = allowedNavigation.some((item) => isCurrent(pathname, item.href));
  const userName = role === "barber" ? "Leonardo Lima" : "Stilo Sampa";
  const userInitials = initials(userName);
  const todayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <main className="app-frame">
      <aside className="desktop-rail desktop-rail--full" aria-label="Navegação principal">
        <Link className="brand-mark" href="/admin" aria-label="Stilo Sampa — painel da barbearia"><Scissors size={23} strokeWidth={2.2} /></Link>
        <nav className="rail-nav rail-nav--full">
          {allowedNavigation.map(({ href, label, icon: Icon }) => (
            <Link className={`rail-link ${isCurrent(pathname, href) ? "is-active" : ""}`} href={href} aria-label={label} title={label} key={href}>
              <Icon />
              {label === "Avisos" && unread > 0 && <span className="rail-badge">{unread}</span>}
            </Link>
          ))}
        </nav>
        <details className="profile-menu rail-profile">
          <summary className="avatar-button">{userInitials}</summary>
          <div className="profile-popover">
            <strong>{userName}</strong><span>{roleLabels[role]}</span>
            {(role === "owner" || role === "manager") && <Link href="/configuracoes"><Settings size={16} /> Configurações</Link>}
            {hasSupabaseEnv ? <form action={signOut}><button type="submit"><LogOut size={16} /> Sair</button></form> : <Link href="/login"><LogOut size={16} /> Sair da demonstração</Link>}
          </div>
        </details>
      </aside>

      <section className="workspace app-workspace">
        <header className="topbar app-topbar">
          <Link className="mobile-wordmark" href="/admin"><Scissors size={18} /> Stilo Sampa <small>Equipe</small></Link>
          <div className="topbar-date"><p className="eyebrow">{todayLabel}</p><span>Barbearia Stilo Sampa</span></div>
          <div className="topbar-actions">
            {!hasSupabaseEnv && <label className="role-preview"><Sparkles size={13} /><span>Visualizar como</span><select value={role} onChange={(event) => setRole(event.target.value as MemberRole)}><option value="owner">Administrador</option><option value="barber">Barbeiro</option><option value="receptionist">Recepção</option></select></label>}
            <Link className="demo-badge customer-preview-link" href="/"><UserRoundCog size={13} /> Área do cliente</Link>
            <Link className="notification-button" href="/notificacoes" aria-label={`${unread} novas notificações`}>
              <Bell size={20} />{unread > 0 && <span>{unread}</span>}
            </Link>
            <details className="profile-menu header-profile">
              <summary><span className="header-avatar">{userInitials}</span><span className="header-user">{userName}<small>{roleLabels[role]}</small></span><ChevronDown size={16} /></summary>
              <div className="profile-popover">
                <strong>{userName}</strong><span>{roleLabels[role]}</span>
                {(role === "owner" || role === "manager") && <Link href="/configuracoes"><Settings size={16} /> Configurações</Link>}
                {hasSupabaseEnv ? <form action={signOut}><button type="submit"><LogOut size={16} /> Sair</button></form> : <Link href="/login"><LogOut size={16} /> Sair da demonstração</Link>}
              </div>
            </details>
          </div>
        </header>
        {routeAllowed ? children : <section className="content-card access-card"><UserRoundCog /><div><p className="eyebrow">Acesso protegido</p><h1>Esta área não faz parte do seu perfil</h1><p>O perfil de {roleLabels[role].toLowerCase()} vê somente as funções necessárias para o trabalho. Volte para sua agenda ou peça ao proprietário para revisar sua função.</p><Link className="button primary" href="/agenda">Abrir minha agenda</Link></div></section>}
      </section>

      <nav className={`mobile-nav ${mobileNavigation.length < 4 ? "is-compact" : ""}`} aria-label="Navegação principal">
        {mobileNavigation.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link className={isCurrent(pathname, href) ? "is-active" : ""} href={href} key={href}><Icon /><span>{label}</span></Link>
        ))}
        <Link className="mobile-create" href="/agenda?novo=1" aria-label="Novo agendamento"><span>+</span></Link>
        {mobileNavigation.slice(2, 4).map(({ href, label, icon: Icon }) => (
          <Link className={isCurrent(pathname, href) ? "is-active" : ""} href={href} key={href}><Icon /><span>{label === "Avisos" ? "Avisos" : label}</span>{label === "Avisos" && unread > 0 && <b>{unread}</b>}</Link>
        ))}
      </nav>
    </main>
  );
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-title">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {action && <div className="page-title__action">{action}</div>}
    </div>
  );
}

import { memo } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  Users,
  Calendar,
  MoreHorizontal,
  Truck,
  Database,
  Settings,
  Zap,
  FileSignature,
} from "lucide-react";

const NAV_PRIMARY = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/agenda", label: "Agenda", icon: Calendar },
] as const;

const NAV_SECONDARY = [
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/backup", label: "Backup", icon: Database },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/termos", label: "Termos", icon: FileSignature },
] as const;

const BOTTOM_NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/orcamentos", label: "Orçam.", icon: FileText },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/mais", label: "Mais", icon: MoreHorizontal },
] as const;

function useActive(to: string, exact = false) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (exact) return path === to;
  if (to === "/") return path === "/";
  return path === to || path.startsWith(to + "/");
}

function NavRow({
  to,
  label,
  icon: Icon,
  exact,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}) {
  const active = useActive(to, exact);
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200",
        active
          ? "glass-brand text-white"
          : "text-foreground/60 hover:text-white hover:bg-white/10",
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={2.5} />
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
}

export const Sidebar = memo(() => {
  return (
    <aside className="hidden md:flex w-20 lg:w-64 glass-strong rounded-none border-l-0 border-y-0 flex-col sticky top-0 h-screen shrink-0 z-30 overflow-x-hidden">
      <div className="p-4 lg:p-6 border-b border-white/10">
        <Link to="/" className="flex items-center gap-3">
          <div className="size-10 glass-brand rounded-xl grid place-items-center text-display text-xl text-white">
            P+
          </div>
          <div className="hidden lg:block">
            <div className="text-display text-lg leading-none">Pintor</div>
            <div className="text-display text-lg leading-none bg-gradient-to-r from-brand to-[oklch(0.65_0.25_295)] bg-clip-text text-transparent">
              Plus
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="hidden lg:block text-[9px] font-mono text-foreground/40 uppercase tracking-widest mb-2 mt-1 px-2">
          {"> Principal"}
        </div>
        {NAV_PRIMARY.map((n) => (
          <NavRow key={n.to} {...n} exact={n.to === "/"} />
        ))}

        <div className="hidden lg:block text-[9px] font-mono text-foreground/40 uppercase tracking-widest mb-2 mt-6 px-2">
          {"> Sistema"}
        </div>
        {NAV_SECONDARY.map((n) => (
          <NavRow key={n.to} {...n} />
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <Link
          to="/orcamentos/novo"
          className="flex items-center justify-center gap-2 glass-brand rounded-xl glass-press py-3.5 text-xs font-bold uppercase tracking-widest text-white"
        >
          <Zap className="size-4" strokeWidth={3} />
          <span className="hidden lg:inline">Novo Orçamento</span>
        </Link>
      </div>
    </aside>
  );
});

export const BottomNav = memo(() => {
  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 glass-strong rounded-2xl grid grid-cols-5 px-1 py-1 max-w-[calc(100vw-2rem)]">
      {BOTTOM_NAV.map((n) => {
        const active = useActive(n.to, n.to === "/");
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 text-[9px] font-black uppercase tracking-tight rounded-2xl transition-all",
              active ? "glass-brand text-white" : "text-foreground/50",
            )}
          >
            <Icon className="size-5" strokeWidth={2.5} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
});

export const PageHeader = memo(({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
}) => {
  return (
    <header className="px-5 lg:px-10 pt-6 lg:pt-8 pb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end border-b border-white/10">
      <div>
        {eyebrow && (
          <div className="inline-block px-2.5 py-1 rounded-full glass text-brand text-[10px] font-black uppercase tracking-widest mb-3">
            {eyebrow}
          </div>
        )}
        <h1 className="text-display text-3xl lg:text-5xl italic leading-none bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
});

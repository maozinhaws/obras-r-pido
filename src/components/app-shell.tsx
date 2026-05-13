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
        "flex items-center gap-3 px-3 py-3 brutal-border-thin text-xs font-black uppercase tracking-widest brutal-press",
        active
          ? "bg-brand text-ink brutal-shadow-sm"
          : "border-transparent text-foreground/50 hover:text-brand hover:border-ink/40",
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={2.5} />
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-20 lg:w-64 bg-midnight border-r-4 border-ink flex-col sticky top-0 h-screen shrink-0">
      <div className="p-4 lg:p-6 border-b-4 border-ink">
        <Link to="/" className="flex items-center gap-3">
          <div className="size-10 bg-brand brutal-border-thin grid place-items-center text-display text-xl text-ink">
            P+
          </div>
          <div className="hidden lg:block">
            <div className="text-display text-lg leading-none">Pintor</div>
            <div className="text-display text-lg leading-none text-brand">Plus</div>
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

      <div className="p-3 border-t-4 border-ink">
        <Link
          to="/orcamentos/novo"
          className="flex items-center justify-center gap-2 bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press py-3 text-xs font-black uppercase tracking-widest"
        >
          <Zap className="size-4" strokeWidth={3} />
          <span className="hidden lg:inline">Novo Orçamento</span>
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-midnight border-t-4 border-ink grid grid-cols-5">
      {BOTTOM_NAV.map((n) => {
        const active = useActive(n.to, n.to === "/");
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-black uppercase tracking-tight",
              active ? "text-brand" : "text-foreground/40",
            )}
          >
            <Icon className="size-5" strokeWidth={2.5} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="px-5 lg:px-10 pt-6 lg:pt-8 pb-6 flex flex-wrap gap-4 justify-between items-end border-b-4 border-ink">
      <div>
        {eyebrow && (
          <div className="inline-block px-2 py-0.5 brutal-border-thin border-brand/40 text-brand text-[10px] font-black uppercase tracking-widest mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="text-display text-3xl lg:text-5xl italic leading-none">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

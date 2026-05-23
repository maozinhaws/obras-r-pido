import { memo, useEffect, useState, createContext, useContext } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  Users,
  Calendar,
  Truck,
  Database,
  Settings,
  Zap,
  FileSignature,
  Menu,
  X,
  Plus,
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

type SidebarCtx = {
  open: boolean;
  collapsed: boolean;
  toggleOpen: () => void;
  toggleCollapsed: () => void;
  close: () => void;
};
const Ctx = createContext<SidebarCtx | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("pp.sidebar.collapsed") === "1";
  }); // desktop mini
  const path = useRouterState({ select: (r) => r.location.pathname });
  // fecha drawer ao mudar de rota
  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("pp.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <Ctx.Provider
      value={{
        open,
        collapsed,
        toggleOpen: () => setOpen((v) => !v),
        toggleCollapsed: () => setCollapsed((v) => !v),
        close: () => setOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

function useSidebar() {
  const c = useContext(Ctx);
  if (!c) throw new Error("SidebarProvider missing");
  return c;
}

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
  showLabel,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  showLabel: boolean;
}) {
  const active = useActive(to, exact);
  return (
    <Link
      to={to}
      title={!showLabel ? label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
        active
          ? "bg-secondary text-foreground border-border"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border-transparent",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2} />
      {showLabel && <span className="truncate">{label}</span>}
    </Link>
  );
}

export const MenuButton = memo(() => {
  const { toggleOpen, toggleCollapsed, open } = useSidebar();
  return (
    <button
      onClick={() => {
        if (window.matchMedia("(min-width: 768px)").matches) toggleCollapsed();
        else toggleOpen();
      }}
      aria-label="Menu"
      className="fixed top-3 left-3 z-50 size-11 bg-card rounded-2xl grid place-items-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] border border-border glass-press md:hidden"
    >
      {open ? (
        <X className="size-5 text-foreground" strokeWidth={2.5} />
      ) : (
        <Menu className="size-5 text-foreground" strokeWidth={2.5} />
      )}
    </button>
  );
});

export const Sidebar = memo(() => {
  const { open, collapsed, close } = useSidebar();
  const showLabel = !collapsed;

  return (
    <>
      {open && (
        <button
          aria-label="Fechar menu"
          onClick={close}
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-[420ms] ease-out animate-fade-in"
        />
      )}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-40 h-dvh shrink-0 flex flex-col border-r border-border/60 overflow-hidden",
          "transition-[width,transform] duration-[460ms] [transition-timing-function:cubic-bezier(.32,.72,0,1)] will-change-transform",
          "bg-[color-mix(in_oklab,var(--card)_45%,transparent)] backdrop-blur-2xl backdrop-saturate-[1.8]",
          collapsed ? "md:w-20" : "md:w-64",
          "w-64",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="p-4 border-b border-border flex items-center gap-3 pl-16 md:pl-4">
          <div className="size-10 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#7b5cff] grid place-items-center text-display text-base text-white shrink-0">
            P+
          </div>
          {showLabel && (
            <div className="min-w-0">
              <div className="text-display text-base leading-none text-foreground">
                Pintor
              </div>
              <div className="text-display text-base leading-none text-brand-2">
                Plus
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {showLabel && (
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-2 mt-1 px-3">
              Principal
            </div>
          )}
          {NAV_PRIMARY.map((n) => (
            <NavRow key={n.to} {...n} exact={n.to === "/"} showLabel={showLabel} />
          ))}

          {showLabel && (
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-2 mt-6 px-3">
              Sistema
            </div>
          )}
          {NAV_SECONDARY.map((n) => (
            <NavRow key={n.to} {...n} showLabel={showLabel} />
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <Link
            to="/orcamentos/novo"
            search={{ modo: "flash" }}
            className="cta-pill w-full justify-center"
            title={!showLabel ? "Novo Orçamento" : undefined}
          >
            <Plus className="size-4" strokeWidth={2.75} />
            {showLabel && <span>Novo Orçamento</span>}
          </Link>
        </div>
      </aside>
    </>
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
    <header className="sticky top-0 z-30 px-5 lg:px-10 pt-6 lg:pt-8 pb-6 pl-20 md:pl-10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end border-b border-border/50 bg-[color-mix(in_oklab,var(--background)_65%,transparent)] backdrop-blur-2xl backdrop-saturate-150">
      <div>
        {eyebrow && (
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em] mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-display text-2xl lg:text-4xl leading-none text-foreground">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  );
});

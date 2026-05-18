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
        "flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors",
        active
          ? "glass-brand text-white"
          : "text-foreground/60 hover:text-white hover:bg-white/10",
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={2.5} />
      {showLabel && <span className="truncate">{label}</span>}
    </Link>
  );
}

export const MenuButton = memo(() => {
  const { toggleOpen, toggleCollapsed, open } = useSidebar();
  return (
    <button
      onClick={() => {
        // mobile abre drawer, desktop colapsa
        if (window.matchMedia("(min-width: 768px)").matches) toggleCollapsed();
        else toggleOpen();
      }}
      aria-label="Menu"
      className="fixed top-3 left-3 z-50 size-11 glass-strong rounded-xl grid place-items-center glass-press"
    >
      {open ? <X className="size-5" strokeWidth={3} /> : <Menu className="size-5" strokeWidth={3} />}
    </button>
  );
});

export const Sidebar = memo(() => {
  const { open, collapsed, close } = useSidebar();
  const showLabel = !collapsed;

  return (
    <>
      {/* overlay mobile */}
      {open && (
        <button
          aria-label="Fechar menu"
          onClick={close}
          className="md:hidden fixed inset-0 z-40 bg-black/60 animate-fade-in"
        />
      )}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-40 h-dvh shrink-0 flex flex-col glass-strong rounded-none border-l-0 border-y-0 transition-[width,transform] duration-300 ease-out overflow-hidden",
          collapsed ? "md:w-20" : "md:w-64",
          // mobile drawer
          "w-64",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-3 pl-16 md:pl-4">
          <div className="size-10 glass-brand rounded-xl grid place-items-center text-display text-xl text-white shrink-0">
            P+
          </div>
          {showLabel && (
            <div className="min-w-0">
              <div className="text-display text-lg leading-none">Pintor</div>
              <div className="text-display text-lg leading-none text-brand">Plus</div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {showLabel && (
            <div className="text-[9px] font-mono text-foreground/40 uppercase tracking-widest mb-2 mt-1 px-2">
              {"> Principal"}
            </div>
          )}
          {NAV_PRIMARY.map((n) => (
            <NavRow key={n.to} {...n} exact={n.to === "/"} showLabel={showLabel} />
          ))}

          {showLabel && (
            <div className="text-[9px] font-mono text-foreground/40 uppercase tracking-widest mb-2 mt-6 px-2">
              {"> Sistema"}
            </div>
          )}
          {NAV_SECONDARY.map((n) => (
            <NavRow key={n.to} {...n} showLabel={showLabel} />
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link
            to="/orcamentos/novo"
            search={{ modo: "flash" }}
            className="flex items-center justify-center gap-2 glass-brand rounded-xl glass-press py-3 text-xs font-bold uppercase tracking-widest text-white"
            title={!showLabel ? "Novo Orçamento" : undefined}
          >
            <Plus className="size-4" strokeWidth={3} />
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
    <header className="px-5 lg:px-10 pt-6 lg:pt-8 pb-6 pl-20 md:pl-10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end border-b border-white/10">
      <div>
        {eyebrow && (
          <div className="inline-block px-2.5 py-1 rounded-full glass text-brand text-[10px] font-black uppercase tracking-widest mb-3">
            {eyebrow}
          </div>
        )}
        <h1 className="text-display text-2xl lg:text-4xl leading-none text-white">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  );
});

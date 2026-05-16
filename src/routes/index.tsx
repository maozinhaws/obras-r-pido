import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, calcularTotal, formatBRL, STATUS_COLORS, STATUS_LABELS } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import {
  Plus,
  UserPlus,
  Camera,
  CalendarCheck,
  Zap,
  X,
  FileText,
  Image as ImageIcon,
  ClipboardList,
  TrendingUp,
  Database,
  ArrowRight,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pintor Plus — Dashboard" },
      {
        name: "description",
        content:
          "Painel do pintor: novo orçamento, fluxo recente, agenda do dia e status do backup.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const config = useLiveQuery(() => db.config.get(1));
  const orcamentos = useLiveQuery(
    () => db.orcamentos.orderBy("atualizadoEm").reverse().limit(4).toArray(),
    [],
    [],
  );
  const eventos = useLiveQuery(
    () =>
      db.eventos
        .where("data")
        .aboveOrEqual(new Date().toISOString().slice(0, 10))
        .sortBy("data"),
    [],
    [],
  );
  const totalClientes = useLiveQuery(() => db.clientes.count(), [], 0);
  const totalAprovados = useLiveQuery(
    () => db.orcamentos.where("status").equals("aprovado").count(),
    [],
    0,
  );
  const faturamento = (orcamentos ?? [])
    .filter((o) => o.status === "aprovado" || o.status === "finalizado")
    .reduce((acc, o) => acc + calcularTotal(o), 0);

  return (
    <div className="min-h-screen">
      <PageHeader
        eyebrow="Painel · System Active"
        title="Performance Hub"
        actions={
          <div className="hidden sm:flex glass rounded-full p-1 gap-1">
            <button className="px-3 py-1.5 glass-brand rounded-full text-[10px] font-black uppercase text-white">
              Hoje
            </button>
            <button className="px-3 py-1.5 text-foreground/50 text-[10px] font-black uppercase rounded-full hover:bg-white/5">
              Semana
            </button>
            <button className="px-3 py-1.5 text-foreground/50 text-[10px] font-black uppercase rounded-full hover:bg-white/5">
              Mês
            </button>
          </div>
        }
      />

      <div className="px-5 lg:px-10 py-6 lg:py-8 grid grid-cols-12 gap-3 lg:gap-4">
        {/* Hero: Novo Orçamento */}
        <div className="col-span-12 lg:col-span-5 glass-brand rounded-3xl p-6 lg:p-8 flex flex-col justify-between min-h-[240px] text-white liquid-ring relative overflow-hidden">
          <div className="absolute -top-16 -right-16 size-56 rounded-full bg-white/20 blur-3xl pointer-events-none" />
          <div className="flex items-start justify-between relative">
            <div className="size-12 rounded-2xl glass-strong grid place-items-center">
              <Plus className="size-7 text-white" strokeWidth={3} />
            </div>
            <span className="text-mono text-[10px] font-bold opacity-80 uppercase">
              {config?.nome ? `> ${config.nome}` : "> SEM EMPRESA"}
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="text-left text-display text-3xl lg:text-5xl leading-[0.9] relative drop-shadow-sm"
          >
            Novo
            <br />
            Orçamento
          </button>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-90 relative">
            <Zap className="size-3" strokeWidth={3} />
            Toque para iniciar
          </div>
        </div>

        {/* Stat: Faturamento */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 glass rounded-2xl p-6 flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center gap-2 text-brand text-mono text-[10px] uppercase tracking-widest">
            <TrendingUp className="size-3" strokeWidth={3} />· Faturamento
          </div>
          <div className="space-y-2">
            <div className="text-display text-3xl lg:text-4xl italic leading-none bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
              {formatBRL(faturamento).replace(",00", "")}
            </div>
            <div className="h-1.5 bg-white/10 w-full rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand to-[oklch(0.65_0.25_295)] w-3/4 rounded-full" />
            </div>
            <div className="text-[10px] font-mono text-foreground/50 uppercase">
              {totalAprovados} aprovado{totalAprovados === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* Stat: Clientes */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-2 glass rounded-2xl p-6 flex flex-col justify-between min-h-[220px]">
          <div className="text-brand text-mono text-[10px] uppercase tracking-widest">
            · Base
          </div>
          <div>
            <div className="text-display text-4xl lg:text-5xl italic leading-none bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
              {totalClientes}
            </div>
            <div className="text-[10px] font-mono text-foreground/50 uppercase mt-1">
              Clientes
            </div>
          </div>
          <Link
            to="/clientes"
            className="text-[10px] font-black text-brand uppercase tracking-widest"
          >
            Abrir →
          </Link>
        </div>

        {/* Atalho secundário */}
        <div className="col-span-12 lg:col-span-2 glass-strong rounded-2xl p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
          <div className="absolute -bottom-10 -left-6 size-40 rounded-full bg-brand/30 blur-3xl pointer-events-none" />
          <UserPlus className="size-7 text-brand relative" strokeWidth={2.5} />
          <Link to="/clientes" className="text-display text-2xl leading-[0.9] relative">
            Novo
            <br />
            Cliente
          </Link>
          <span className="text-[10px] font-mono opacity-60 uppercase relative">
            Cadastrar contato
          </span>
        </div>

        {/* Fluxo de Orçamentos */}
        <div className="col-span-12 lg:col-span-8 glass rounded-2xl p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-display text-xl lg:text-2xl italic">
              Fluxo de Orçamentos
            </h2>
            <Link
              to="/orcamentos"
              className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-1 px-3 py-1.5 rounded-full glass-press hover:bg-white/5"
            >
              Histórico <ArrowRight className="size-3" strokeWidth={3} />
            </Link>
          </div>
          {!orcamentos || orcamentos.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-8" strokeWidth={2.5} />}
              title="Nenhum orçamento ainda"
              cta={
                <button
                  onClick={() => setModalOpen(true)}
                  className="glass-brand rounded-full glass-press px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white"
                >
                  Criar primeiro
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {orcamentos.map((o) => (
                <Link
                  key={o.id}
                  to="/orcamentos/$id"
                  params={{ id: String(o.id) }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 glass-press group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="size-10 glass-brand rounded-xl grid place-items-center text-display text-lg text-white shrink-0">
                      $
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm uppercase truncate">
                        {o.clienteSnapshot?.nome ?? "Sem cliente"}
                      </p>
                      <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}
                        >
                          {STATUS_LABELS[o.status]}
                        </span>
                        {format(o.atualizadoEm, "dd MMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-display text-lg lg:text-xl italic group-hover:text-brand transition-colors">
                      {formatBRL(calcularTotal(o)).replace(",00", "")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Próximo evento */}
        <div className="col-span-12 lg:col-span-4 glass rounded-2xl overflow-hidden relative min-h-[300px]">
          <div className="absolute -top-12 -right-12 size-48 rounded-full bg-[oklch(0.65_0.25_295)]/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 size-56 rounded-full bg-brand/20 blur-3xl" />
          <div className="p-6 lg:p-8 relative z-10 h-full flex flex-col justify-between">
            <div className="inline-block self-start px-3 py-1 rounded-full glass-strong text-white text-[10px] font-black uppercase mb-4">
              <Clock className="size-3 inline mr-1 -mt-0.5" strokeWidth={3} />
              {eventos && eventos[0]
                ? format(new Date(eventos[0].data + "T" + (eventos[0].hora ?? "08:00")), "dd MMM · HH:mm", { locale: ptBR })
                : "Sem eventos"}
            </div>
            <div>
              <h4 className="text-display text-2xl lg:text-3xl italic leading-[0.95] mb-4 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                {eventos && eventos[0] ? eventos[0].titulo : "Agenda livre"}
              </h4>
              {eventos && eventos[0] && (
                <div className="text-[10px] font-mono text-foreground/50 space-y-1">
                  <p>{`> ${eventos[0].observacao ?? "Sem observação"}`}</p>
                </div>
              )}
            </div>
            <Link
              to="/agenda"
              className="self-start mt-4 text-[10px] font-black text-brand uppercase tracking-widest"
            >
              Ver agenda →
            </Link>
          </div>
        </div>

        {/* Atalhos rápidos */}
        {[
          { to: "/orcamentos/novo", icon: Camera, l1: "Foto", l2: "Rápida" },
          { to: "/agenda", icon: CalendarCheck, l1: "Novo", l2: "Evento" },
          { to: "/orcamentos", icon: FileText, l1: "Gerar", l2: "PDF" },
          { to: "/backup", icon: Database, l1: "Backup", l2: "Dados" },
        ].map(({ to, icon: Icon, l1, l2 }) => (
          <Link
            key={to}
            to={to}
            className="col-span-6 lg:col-span-3 glass rounded-2xl p-5 glass-press flex items-center gap-3 hover:bg-white/[0.08]"
          >
            <div className="size-11 rounded-xl glass-brand grid place-items-center shrink-0">
              <Icon className="size-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-display text-sm leading-tight">
              {l1}
              <br />
              {l2}
            </div>
          </Link>
        ))}
      </div>

      {modalOpen && <NovoOrcamentoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center bg-white/[0.02]">
      <div className="text-foreground/40 mx-auto mb-3 w-fit">{icon}</div>
      <p className="text-foreground/60 text-sm font-bold uppercase tracking-widest mb-4">
        {title}
      </p>
      {cta}
    </div>
  );
}

function NovoOrcamentoModal({ onClose }: { onClose: () => void }) {
  const modos: Array<{
    modo: "flash" | "foto" | "detalhado";
    icon: typeof Zap;
    title: string;
    desc: string;
    tags?: string[];
  }> = [
    { modo: "flash", icon: Zap, title: "Modo Flash", desc: "Rápido e prático", tags: ["Foto", "Texto", "Voz"] },
    { modo: "foto", icon: ImageIcon, title: "Modo Foto", desc: "Análise por imagem" },
    { modo: "detalhado", icon: ClipboardList, title: "Detalhado", desc: "Relatório completo" },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-strong rounded-3xl w-full max-w-2xl overflow-hidden animate-scale-in relative">
        <div className="absolute -top-20 -right-20 size-64 rounded-full bg-brand/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-[oklch(0.65_0.25_295)]/30 blur-3xl pointer-events-none" />
        <div className="p-5 flex justify-between items-center border-b border-white/10 relative">
          <h3 className="text-display text-xl lg:text-2xl">Tipo de Orçamento</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full glass grid place-items-center hover:bg-white/10 transition-colors"
          >
            <X className="size-5" strokeWidth={3} />
          </button>
        </div>
        <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {modos.map(({ modo, icon: Icon, title, desc, tags }) => (
            <Link
              key={modo}
              to="/orcamentos/novo"
              search={{ modo }}
              onClick={onClose}
              className="glass rounded-2xl p-5 hover:bg-white/10 glass-press group"
            >
              <div className="size-12 rounded-2xl glass-brand grid place-items-center mb-4">
                <Icon className="size-6 text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              </div>
              <h4 className="text-display text-lg leading-none mb-2">{title}</h4>
              <p className="text-[10px] font-bold opacity-60 uppercase mb-3">
                {desc}
              </p>
              {tags && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-black uppercase"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
        <div className="px-6 pb-5 text-[10px] font-mono opacity-50 uppercase relative">
          {"> Salva como rascunho automaticamente"}
        </div>
      </div>
    </div>
  );
}

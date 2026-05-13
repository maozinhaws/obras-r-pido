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
          <div className="hidden sm:flex brutal-border-thin bg-midnight">
            <button className="px-3 py-1.5 bg-brand text-ink text-[10px] font-black uppercase">
              Hoje
            </button>
            <button className="px-3 py-1.5 text-foreground/40 text-[10px] font-black uppercase">
              Semana
            </button>
            <button className="px-3 py-1.5 text-foreground/40 text-[10px] font-black uppercase">
              Mês
            </button>
          </div>
        }
      />

      <div className="px-5 lg:px-10 py-6 lg:py-8 grid grid-cols-12 gap-3 lg:gap-4">
        {/* Saudação + atalho principal */}
        <div className="col-span-12 lg:col-span-5 bg-brand text-ink brutal-border brutal-shadow p-6 lg:p-8 flex flex-col justify-between min-h-[220px]">
          <div className="flex items-start justify-between">
            <div className="size-12 brutal-border-thin bg-white grid place-items-center">
              <Plus className="size-7" strokeWidth={3} />
            </div>
            <span className="text-mono text-[10px] font-bold opacity-60 uppercase">
              {config?.nome ? `> ${config.nome}` : "> SEM EMPRESA"}
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="text-left text-display text-3xl lg:text-4xl leading-[0.9]"
          >
            Novo
            <br />
            Orçamento
          </button>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70">
            <Zap className="size-3" strokeWidth={3} />
            Toque para iniciar
          </div>
        </div>

        {/* Stat: Faturamento */}
        <div className="col-span-6 lg:col-span-3 bg-surface brutal-border p-5 flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center gap-2 text-brand text-mono text-[10px] uppercase tracking-widest">
            <TrendingUp className="size-3" strokeWidth={3} />· Faturamento
          </div>
          <div className="space-y-2">
            <div className="text-display text-3xl lg:text-4xl italic leading-none">
              {formatBRL(faturamento).replace(",00", "")}
            </div>
            <div className="h-2 bg-white/10 w-full overflow-hidden">
              <div className="h-full bg-brand w-3/4" />
            </div>
            <div className="text-[10px] font-mono text-foreground/40 uppercase">
              {totalAprovados} aprovado{totalAprovados === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* Stat: Clientes */}
        <div className="col-span-6 lg:col-span-2 bg-surface brutal-border p-5 flex flex-col justify-between min-h-[220px]">
          <div className="text-brand text-mono text-[10px] uppercase tracking-widest">
            · Base
          </div>
          <div>
            <div className="text-display text-4xl lg:text-5xl italic leading-none">
              {totalClientes}
            </div>
            <div className="text-[10px] font-mono text-foreground/40 uppercase mt-1">
              Clientes
            </div>
          </div>
          <Link
            to="/clientes"
            className="text-[10px] font-black text-brand uppercase tracking-widest underline underline-offset-2"
          >
            Abrir →
          </Link>
        </div>

        {/* Atalho secundário grande */}
        <div className="col-span-12 lg:col-span-2 bg-white text-ink brutal-border brutal-shadow-brand p-5 flex flex-col justify-between min-h-[220px]">
          <UserPlus className="size-7" strokeWidth={3} />
          <Link to="/clientes" className="text-display text-2xl leading-[0.9]">
            Novo
            <br />
            Cliente
          </Link>
          <span className="text-[10px] font-mono opacity-60 uppercase">
            Cadastrar contato
          </span>
        </div>

        {/* Fluxo de Orçamentos */}
        <div className="col-span-12 lg:col-span-8 bg-surface brutal-border p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-display text-xl lg:text-2xl italic">
              Fluxo de Orçamentos
            </h2>
            <Link
              to="/orcamentos"
              className="text-[10px] font-black text-brand uppercase tracking-widest underline decoration-2 underline-offset-4 flex items-center gap-1"
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
                  className="bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-2 text-xs font-black uppercase tracking-widest"
                >
                  Criar primeiro
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {orcamentos.map((o) => (
                <Link
                  key={o.id}
                  to="/orcamentos/$id"
                  params={{ id: String(o.id) }}
                  className="flex items-center justify-between p-4 bg-midnight brutal-border-thin hover:border-brand/60 brutal-press group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="size-10 bg-brand text-ink grid place-items-center text-display text-lg shrink-0">
                      $
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm uppercase truncate">
                        {o.clienteSnapshot?.nome ?? "Sem cliente"}
                      </p>
                      <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-widest mt-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 mr-2 ${STATUS_COLORS[o.status]}`}
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
        <div className="col-span-12 lg:col-span-4 bg-midnight brutal-border overflow-hidden relative">
          <div className="p-6 lg:p-8 relative z-10 h-full flex flex-col justify-between min-h-[280px]">
            <div className="inline-block self-start px-2 py-1 bg-white text-ink text-[10px] font-black uppercase mb-4">
              {eventos && eventos[0]
                ? format(new Date(eventos[0].data + "T" + (eventos[0].hora ?? "08:00")), "dd MMM · HH:mm", { locale: ptBR })
                : "Sem eventos"}
            </div>
            <div>
              <h4 className="text-display text-2xl lg:text-3xl italic leading-[0.95] mb-4">
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
              className="self-start mt-4 text-[10px] font-black text-brand uppercase tracking-widest underline underline-offset-2"
            >
              Ver agenda →
            </Link>
          </div>
          <div className="absolute bottom-0 right-0 size-32 bg-brand/10 -rotate-12 translate-x-8 translate-y-8 brutal-border-thin border-brand/30 pointer-events-none" />
        </div>

        {/* Atalhos rápidos */}
        <Link
          to="/orcamentos/novo"
          className="col-span-6 lg:col-span-3 bg-surface brutal-border p-5 brutal-press flex items-center gap-3"
        >
          <Camera className="size-7 text-brand" strokeWidth={2.5} />
          <div className="text-display text-sm leading-tight">
            Foto
            <br />
            Rápida
          </div>
        </Link>
        <Link
          to="/agenda"
          className="col-span-6 lg:col-span-3 bg-surface brutal-border p-5 brutal-press flex items-center gap-3"
        >
          <CalendarCheck className="size-7 text-brand" strokeWidth={2.5} />
          <div className="text-display text-sm leading-tight">
            Novo
            <br />
            Evento
          </div>
        </Link>
        <Link
          to="/orcamentos"
          className="col-span-6 lg:col-span-3 bg-surface brutal-border p-5 brutal-press flex items-center gap-3"
        >
          <FileText className="size-7 text-brand" strokeWidth={2.5} />
          <div className="text-display text-sm leading-tight">
            Gerar
            <br />
            PDF
          </div>
        </Link>
        <Link
          to="/backup"
          className="col-span-6 lg:col-span-3 bg-surface brutal-border p-5 brutal-press flex items-center gap-3"
        >
          <Database className="size-7 text-brand" strokeWidth={2.5} />
          <div className="text-display text-sm leading-tight">
            Backup
            <br />
            Dados
          </div>
        </Link>
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
    <div className="brutal-border-thin border-dashed border-foreground/20 p-10 text-center">
      <div className="text-foreground/40 mx-auto mb-3 w-fit">{icon}</div>
      <p className="text-foreground/60 text-sm font-bold uppercase tracking-widest mb-4">
        {title}
      </p>
      {cta}
    </div>
  );
}

function NovoOrcamentoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-midnight/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-ink w-full max-w-2xl brutal-border brutal-shadow-brand">
        <div className="bg-ink text-white p-5 flex justify-between items-center">
          <h3 className="text-display text-xl lg:text-2xl">Tipo de Orçamento</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-brand brutal-press p-1"
          >
            <X className="size-6" strokeWidth={3} />
          </button>
        </div>
        <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/orcamentos/novo"
            search={{ modo: "flash" }}
            onClick={onClose}
            className="brutal-border-thin p-5 hover:bg-brand transition-colors group"
          >
            <Zap className="size-9 mb-3 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <h4 className="text-display text-lg leading-none mb-2">Modo Flash</h4>
            <p className="text-[10px] font-bold opacity-50 uppercase mb-3">
              Rápido e prático
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Foto", "Texto", "Voz"].map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 bg-ink text-white text-[9px] font-black uppercase"
                >
                  {t}
                </span>
              ))}
            </div>
          </Link>

          <Link
            to="/orcamentos/novo"
            search={{ modo: "foto" }}
            onClick={onClose}
            className="brutal-border-thin p-5 hover:bg-brand transition-colors group"
          >
            <ImageIcon className="size-9 mb-3 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <h4 className="text-display text-lg leading-none mb-2">Modo Foto</h4>
            <p className="text-[10px] font-bold opacity-50 uppercase">
              Análise por imagem
            </p>
          </Link>

          <Link
            to="/orcamentos/novo"
            search={{ modo: "detalhado" }}
            onClick={onClose}
            className="brutal-border-thin p-5 hover:bg-brand transition-colors group"
          >
            <ClipboardList className="size-9 mb-3 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            <h4 className="text-display text-lg leading-none mb-2">Detalhado</h4>
            <p className="text-[10px] font-bold opacity-50 uppercase">
              Relatório completo
            </p>
          </Link>
        </div>
        <div className="px-6 pb-5 text-[10px] font-mono opacity-40 uppercase">
          {"> Salva como rascunho automaticamente"}
        </div>
      </div>
    </div>
  );
}

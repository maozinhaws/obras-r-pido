import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, memo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, calcularTotal, formatBRL, STATUS_LABELS } from "@/lib/db";
import {
  Plus,
  Zap,
  X,
  Image as ImageIcon,
  ClipboardList,
  ArrowUpRight,
  Calendar,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { uid } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pintor Plus — Dashboard" },
      {
        name: "description",
        content:
          "Painel do pintor: novo orçamento, fluxo recente e agenda do dia.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const dashboard = useLiveQuery(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [config, orcamentos, eventos, totalClientes] = await Promise.all([
      db.config.get(1),
      db.orcamentos.orderBy("atualizadoEm").reverse().limit(4).toArray(),
      db.eventos.where("data").aboveOrEqual(today).sortBy("data"),
      db.clientes.count(),
    ]);
    return { config, orcamentos, eventos, totalClientes };
  }, []);

  const orcamentos = dashboard?.orcamentos ?? [];
  const eventos = dashboard?.eventos ?? [];
  const totalClientes = dashboard?.totalClientes ?? 0;
  const faturamento = orcamentos
    .filter((o) => o.status === "aprovado" || o.status === "finalizado")
    .reduce((acc, o) => acc + calcularTotal(o), 0);

  const proximoEvento = eventos[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-md mx-auto px-4 pt-14 pb-10 space-y-6">
        {/* Header */}
        <header className="px-2">
          <div className="mb-4">
            <p className="text-gray-500 text-[11px] font-semibold uppercase tracking-[0.2em]">
              Painel · System Active
            </p>
            <h1 className="text-display text-3xl text-gray-900 mt-1 leading-none">
              Performance Hub
            </h1>
          </div>

          {/* Inline metrics */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <MetricPill
              dotColor="#ff6b35"
              label={`${formatBRL(faturamento).replace(",00", "")} Faturamento`}
            />
            <MetricPill
              dotColor="#7b5cff"
              label={`${totalClientes} Cliente${totalClientes === 1 ? "" : "s"}`}
            />
          </div>
        </header>

        {/* Hero CTA — gradient */}
        <button
          onClick={() => setModalOpen(true)}
          className="block w-full text-left glass-brand-glow glass-press group"
        >
          <div className="glass-brand p-7">
            <div className="flex justify-between items-start mb-12">
              <div className="size-12 rounded-2xl bg-white/20 backdrop-blur-md grid place-items-center">
                <Plus className="size-6 text-white" strokeWidth={2.75} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] bg-black/15 text-white px-3 py-1.5 rounded-full">
                Toque para iniciar
              </span>
            </div>
            <h2 className="text-display text-3xl uppercase leading-[0.95] tracking-tight">
              Novo
              <br />
              Orçamento
            </h2>
            <p className="text-white/85 font-medium text-sm mt-2">
              Comece a transformar um novo ambiente hoje.
            </p>
          </div>
        </button>

        {/* Fluxo de Orçamentos */}
        <div className="glass p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-display text-base text-gray-900 uppercase tracking-tight">
              Fluxo de Orçamentos
            </h3>
            <Link
              to="/orcamentos"
              className="text-brand-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
            >
              Histórico <ArrowUpRight className="size-3" strokeWidth={3} />
            </Link>
          </div>

          {orcamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="size-16 bg-[#f4f4f6] rounded-2xl grid place-items-center mb-4">
                <FileText className="size-7 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-400 font-semibold text-sm mb-5">
                Nenhum orçamento ainda
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-dark glass-press"
              >
                Criar Primeiro
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {orcamentos.map((o) => (
                <Link
                  key={o.id}
                  to="/orcamentos/$id"
                  params={{ id: String(o.id) }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#fafafb] hover:bg-[#f4f4f6] glass-press"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#7b5cff] grid place-items-center text-white font-bold text-sm shrink-0">
                      $
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">
                        {o.clienteSnapshot?.nome ?? "Sem cliente"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                        {STATUS_LABELS[o.status]} ·{" "}
                        {format(o.atualizadoEm, "dd MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <p className="text-display text-sm text-gray-900 shrink-0">
                    {formatBRL(calcularTotal(o)).replace(",00", "")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Agenda */}
        <Link
          to="/agenda"
          className="glass p-6 flex justify-between items-center glass-press"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`size-1.5 rounded-full ${proximoEvento ? "bg-[#ff6b35]" : "bg-green-500"}`}
              />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                {proximoEvento ? "Próximo evento" : "Sem eventos"}
              </span>
            </div>
            <h3 className="text-display text-xl text-gray-900 uppercase leading-none truncate">
              {proximoEvento ? proximoEvento.titulo : "Agenda Livre"}
            </h3>
            <span className="text-brand text-[10px] font-bold uppercase tracking-widest pt-2 inline-flex items-center gap-1">
              Ver agenda <ArrowUpRight className="size-3" strokeWidth={3} />
            </span>
          </div>
          <div className="size-20 bg-[#f4f4f6] rounded-2xl grid place-items-center shrink-0 ml-3">
            <Calendar className="size-10 text-gray-300" strokeWidth={1.5} />
          </div>
        </Link>
      </div>

      {modalOpen && <NovoOrcamentoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}

function MetricPill({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <div className="flex-none bg-white border border-[#ececef] px-3.5 py-2 rounded-full flex items-center gap-2">
      <div
        className="size-2 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

export const NovoOrcamentoModal = memo(({ onClose }: { onClose: () => void }) => {
  const modos: Array<{
    modo: "flash" | "foto" | "detalhado";
    icon: typeof Zap;
    title: string;
    desc: string;
  }> = [
    { modo: "flash", icon: Zap, title: "Modo Flash", desc: "Rápido e prático" },
    { modo: "foto", icon: ImageIcon, title: "Modo Foto", desc: "Análise por imagem" },
    { modo: "detalhado", icon: ClipboardList, title: "Detalhado", desc: "Relatório completo" },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden animate-scale-in shadow-2xl">
        <div className="p-5 flex justify-between items-center border-b border-gray-100">
          <h3 className="text-display text-xl text-gray-900">Tipo de Orçamento</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full bg-[#f4f4f6] grid place-items-center hover:bg-[#ececef] transition-colors"
          >
            <X className="size-5 text-gray-700" strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {modos.map(({ modo, icon: Icon, title, desc }) => (
            <Link
              key={modo}
              to="/orcamentos/novo"
              search={{ modo, draftKey: uid() }}
              onClick={onClose}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[#fafafb] hover:bg-[#f4f4f6] glass-press"
            >
              <div className="size-12 rounded-2xl bg-gradient-to-br from-[#ff6b35] to-[#7b5cff] grid place-items-center shrink-0">
                <Icon className="size-6 text-white" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900">{title}</h4>
                <p className="text-xs text-gray-500 font-medium">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});

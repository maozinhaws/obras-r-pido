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

  const nomeEmpresa = dashboard?.config?.nome?.trim() || "Sua Empresa";

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--bg-hero)" }}
    >
      <div
        className="w-full max-w-md mx-auto px-4 pt-3 pb-10 space-y-4"
        style={{ color: "var(--on-hero)" }}
      >
        {/* Header card — empresa + métricas (entre menu e toggle) */}
        <Link
          to="/configuracoes"
          aria-label="Editar empresa nas configurações"
          className="block active:scale-[0.99] transition"
          style={{
            background: "var(--card-solid)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--card-border-strong)",
            borderRadius: "0 24px 24px 24px",
            padding: "16px 16px 18px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-center pl-12 pr-12 min-h-[44px] text-center">
            <div className="min-w-0">
              <h1 className="text-display text-[22px] font-extrabold leading-none truncate" style={{ color: "var(--on-hero)" }}>
                {nomeEmpresa}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] mt-1" style={{ color: "var(--brand-2)" }}>
                Pintor Plus
              </p>
            </div>
          </div>
          <div className="mt-3 h-px" style={{ background: "var(--card-border-strong)" }} />
          <div className="grid grid-cols-2 mt-3 divide-x" style={{ borderColor: "var(--card-border-strong)" }}>
            <div className="text-center px-2">
              <p className="text-display text-xl leading-none" style={{ color: "var(--on-hero)" }}>
                {formatBRL(faturamento).replace(",00", "")}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] mt-1.5 inline-flex items-center gap-1.5" style={{ color: "var(--on-hero-muted)" }}>
                <span className="size-[6px] rounded-full" style={{ background: "#ff6b35" }} />
                Faturamento
              </p>
            </div>
            <div className="text-center px-2">
              <p className="text-display text-xl leading-none" style={{ color: "var(--on-hero)" }}>
                {totalClientes}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] mt-1.5 inline-flex items-center gap-1.5" style={{ color: "var(--on-hero-muted)" }}>
                <span className="size-[6px] rounded-full" style={{ background: "#7b5cff" }} />
                Cliente{totalClientes === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </Link>

        {/* Hero CTA — Apple Glass */}
        <button
          onClick={() => setModalOpen(true)}
          className="relative w-full overflow-hidden text-left transition-transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-brand-2/30"
          style={{
            background:
              "linear-gradient(120deg, #ff6b35 0%, #ff7a3d 25%, #f25a6b 50%, #b85cc4 75%, #7b5cff 100%)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "36px 0 36px 36px",
            padding: "28px 24px",
            boxShadow: "0 20px 60px -15px rgba(123,92,255,0.5)",
          }}
          aria-label="Novo Orçamento"
        >
          {/* Lens flare */}
          <span className="hero-flare pointer-events-none absolute inset-0" />
          <div className="relative z-10 flex justify-between items-center mb-6">
            <span
              className="text-[9px] font-bold uppercase tracking-[0.14em] text-white px-3 py-[5px] rounded-full"
              style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(10px)" }}
            >
              Toque para iniciar
            </span>
            <div
              className="size-[52px] rounded-full grid place-items-center"
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            >
              <Plus className="size-7 text-white" strokeWidth={2} />
            </div>
          </div>
          <h2
            className="relative z-10 text-display font-extrabold uppercase tracking-tight leading-[1] mb-2"
            style={{ fontSize: 36, textShadow: "0 2px 4px rgba(0,0,0,0.18)" }}
          >
            Novo
            <br />
            Orçamento
          </h2>
          <p className="relative z-10 text-[13px] font-medium text-white/85">
            Comece a transformar um novo ambiente hoje.
          </p>
        </button>

        {/* Fluxo de Orçamentos — Glass card */}
        <div
          className="relative"
          style={{
            background: "var(--card-solid)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--card-border-strong)",
            borderRadius: "0 24px 24px 24px",
            padding: 20,
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-[14px] font-extrabold uppercase tracking-[0.04em]">
              Fluxo de Orçamentos
            </span>
            <Link
              to="/orcamentos"
              className="text-[10px] font-bold uppercase tracking-[0.14em] inline-flex items-center gap-1"
              style={{ color: "var(--brand-2)" }}
            >
              Histórico <ArrowUpRight className="size-3" strokeWidth={3} />
            </Link>
          </div>

          {orcamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-4">
              <div
                className="size-14 rounded-2xl grid place-items-center mb-3"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--surface-2-border)",
                }}
              >
                <FileText className="size-6" style={{ color: "var(--on-hero-muted)" }} strokeWidth={1.5} />
              </div>
              <p className="text-[13px] mb-4" style={{ color: "var(--on-hero-muted)" }}>
                Nenhum orçamento registrado ainda.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] active:scale-95 transition"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
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
                  className="relative flex items-center justify-between p-3 rounded-2xl transition-all active:scale-[0.98]"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--surface-2-border)",
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="size-10 rounded-xl grid place-items-center text-white font-bold text-sm shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #ff6b35, #7b5cff)",
                        boxShadow: "0 8px 16px -4px rgba(255,107,53,0.4)",
                      }}
                    >
                      $
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] truncate" style={{ color: "var(--on-hero)" }}>
                        {o.clienteSnapshot?.nome ?? "Sem cliente"}
                      </p>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
                        style={{ color: "var(--on-hero-muted)" }}
                      >
                        {STATUS_LABELS[o.status]} ·{" "}
                        {format(o.atualizadoEm, "dd MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <p className="text-display text-[13px] shrink-0" style={{ color: "var(--on-hero)" }}>
                    {formatBRL(calcularTotal(o)).replace(",00", "")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>


        {/* Agenda — Glass card */}
        <Link
          to="/agenda"
          className="relative block active:scale-[0.99] transition"
          style={{
            background: "var(--card-solid)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--card-border-strong)",
            borderRadius: "0 24px 24px 24px",
            padding: 20,
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[14px] font-extrabold uppercase tracking-[0.04em] inline-flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${proximoEvento ? "bg-[#ff6b35] animate-pulse" : "bg-[#4ade80]"}`}
              />
              {proximoEvento ? "Próximo Evento" : "Próximos Eventos"}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.14em] inline-flex items-center gap-1"
              style={{ color: "var(--brand-2)" }}
            >
              Ver agenda <ArrowUpRight className="size-3" strokeWidth={3} />
            </span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <div className="min-w-0">
              <h3 className="text-display text-xl uppercase leading-none truncate" style={{ color: "var(--on-hero)" }}>
                {proximoEvento ? proximoEvento.titulo : "Agenda Livre"}
              </h3>
              {proximoEvento && (
                <p className="text-[11px] mt-1" style={{ color: "var(--on-hero-muted)" }}>
                  {format(new Date(proximoEvento.data), "dd 'de' MMM", { locale: ptBR })}
                </p>
              )}
            </div>
            <div
              className="size-16 rounded-2xl grid place-items-center shrink-0"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--surface-2-border)",
              }}
            >
              <Calendar className="size-8" style={{ color: "var(--brand-2)" }} strokeWidth={1.5} />
            </div>
          </div>
        </Link>
      </div>

      {modalOpen && <NovoOrcamentoModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}


function GlassMetric({ dotColor, label }: { dotColor: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-[14px] py-[7px] rounded-full text-[12px] font-semibold"
      style={{
        background: "var(--card-solid)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--card-border-strong)",
        color: "var(--on-hero)",
      }}
    >
      <span className="size-[7px] rounded-full" style={{ background: dotColor }} />
      {label}
    </span>
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
      <div className="bg-card rounded-[32px] w-full max-w-md overflow-hidden animate-scale-in shadow-2xl">
        <div className="p-5 flex justify-between items-center border-b border-border">
          <h3 className="text-display text-xl text-foreground">Tipo de Orçamento</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full bg-muted grid place-items-center hover:bg-muted transition-colors"
          >
            <X className="size-5 text-foreground" strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {modos.map(({ modo, icon: Icon, title, desc }) => (
            <Link
              key={modo}
              to="/orcamentos/novo"
              search={{ modo, draftKey: uid() }}
              onClick={onClose}
              className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted glass-press"
            >
              <div className="mode-avatar">
                <Icon className="size-6 text-white" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-foreground">{title}</h4>
                <p className="text-xs text-muted-foreground font-medium">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});

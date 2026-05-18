import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  calcularTotal,
  formatBRL,
  STATUS_COLORS,
  STATUS_LABELS,
  type StatusOrcamento,
} from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Plus, Search, Trash2, FileText, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { gerarPdfOrcamento, gerarMensagemWhatsapp, baixarBlob } from "@/lib/pdf";
import { whatsappLink } from "@/lib/utils";

export const Route = createFileRoute("/orcamentos/")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Pintor Plus" },
      { name: "description", content: "Histórico de orçamentos do pintor com PDF e WhatsApp." },
    ],
  }),
  component: OrcamentosPage,
});

const STATUSES: StatusOrcamento[] = [
  "rascunho",
  "enviado",
  "aprovado",
  "em_andamento",
  "finalizado",
  "cancelado",
];

import { memo, useMemo } from "react";

const OrcamentoCard = memo(({ o, STATUSES }: { o: any, STATUSES: StatusOrcamento[] }) => (
  <div key={o.id} className="glass p-5 space-y-4 group">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-black uppercase truncate">
          {o.clienteSnapshot?.nome ?? "Sem cliente"}
        </p>
        <p className="text-mono text-[10px] text-foreground/40 uppercase">
          #{o.id} · {format(o.atualizadoEm, "dd MMM yy, HH:mm", { locale: ptBR })}
        </p>
      </div>
      <div className="text-display text-2xl italic text-brand shrink-0">
        {formatBRL(calcularTotal(o)).replace(",00", "")}
      </div>
    </div>
    <select
      value={o.status}
      onChange={(e) =>
        db.orcamentos.update(o.id!, {
          status: e.target.value as StatusOrcamento,
          atualizadoEm: Date.now(),
        })
      }
      className={`glass px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_COLORS[o.status as StatusOrcamento]}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-surface text-foreground">
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
    <div className="flex flex-wrap gap-2">
      <Link
        to="/orcamentos/$id"
        params={{ id: String(o.id) }}
        className="flex-1 glass glass-press px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-center"
      >
        Ver
      </Link>
      <button
        onClick={async () => {
          const blob = await gerarPdfOrcamento(o);
          baixarBlob(blob, `orcamento-${o.id}.pdf`);
        }}
        className="glass glass-press px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
      >
        <FileText className="size-3" /> PDF
      </button>
      {o.clienteSnapshot?.telefone && (
        <button
          onClick={async () => {
            const msg = await gerarMensagemWhatsapp(o);
            window.open(whatsappLink(o.clienteSnapshot!.telefone!, msg), "_blank");
          }}
          className="glass-brand glass-press px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-white"
        >
          <MessageCircle className="size-3" /> Wpp
        </button>
      )}
      <button
        onClick={() => confirm("Excluir orçamento?") && db.orcamentos.delete(o.id!)}
        className="glass glass-press border-destructive/20 px-3 py-2.5 text-destructive"
        aria-label="Excluir"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  </div>
));

function OrcamentosPage() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<StatusOrcamento | "todos">("todos");
  const orcamentos = useLiveQuery(
    () => {
      const query = filtro === "todos" 
        ? db.orcamentos.orderBy("atualizadoEm")
        : db.orcamentos.where("status").equals(filtro).reverse();
      
      return query.reverse().toArray();
    },
    [filtro],
    [],
  );

  const lista = useMemo(() => {
    return (orcamentos ?? []).filter((o) => {
      if (filtro !== "todos" && o.status !== filtro) return false;
      if (busca && !(o.clienteSnapshot?.nome ?? "").toLowerCase().includes(busca.toLowerCase()))
        return false;
      return true;
    });
  }, [orcamentos, filtro, busca]);

  return (
    <div>
      <PageHeader
        eyebrow={`Histórico · ${orcamentos?.length ?? 0} total`}
        title="Orçamentos"
        actions={
          <Link
            to="/orcamentos/novo"
            className="glass-brand text-white glass-press px-5 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Plus className="size-4" strokeWidth={3} /> Novo
          </Link>
        }
      />

      <div className="px-5 lg:px-10 py-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/40" />
          <input
            type="search"
            placeholder="Buscar por cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["todos", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={`glass px-4 py-2 text-[10px] font-bold uppercase tracking-widest glass-press ${
                filtro === s ? "glass-brand text-white" : "text-foreground/60"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {lista.length === 0 ? (
          <div className="brutal-border-thin border-dashed border-foreground/20 p-12 text-center">
            <p className="text-foreground/50 text-sm font-bold uppercase tracking-widest mb-4">
              Nenhum orçamento
            </p>
            <Link
              to="/orcamentos/novo"
              className="glass-brand text-white glass-press px-5 py-2.5 text-xs font-bold uppercase tracking-widest"
            >
              Criar primeiro
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {lista.map((o) => (
              <OrcamentoCard key={o.id} o={o} STATUSES={STATUSES} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

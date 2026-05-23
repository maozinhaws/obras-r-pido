import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, memo, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  calcularTotal,
  formatBRL,
  STATUS_COLORS,
  STATUS_LABELS,
  type StatusOrcamento,
  type Orcamento,
} from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Plus, Search, Trash2, Share2, Edit3, Eye, Receipt, Tag, Filter, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { updateStatusWithLog } from "@/lib/orcamentos";
import { CardMenu } from "@/components/card-menu";
import { StatusPicker } from "@/components/status-picker";
import { ShareOrcamentoModal } from "@/components/share-orcamento-modal";


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

const OrcamentoCard = memo(({ o }: { o: Orcamento }) => {
  const nav = useNavigate();
  const [statusOpen, setStatusOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTexto, setShareTexto] = useState("");

  async function abrirCompartilhar() {
    const texto = await gerarMensagemWhatsapp(o);
    setShareTexto(texto);
    setShareOpen(true);
  }

  return (
    <div className="glass p-5 space-y-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black uppercase truncate">
            {o.clienteSnapshot?.nome ?? "Sem cliente"}
          </p>
          <p className="text-mono text-[10px] text-foreground/40 uppercase">
            #{o.id} · {format(o.atualizadoEm, "dd MMM yy, HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-start gap-2 shrink-0">
          <div className="text-display text-2xl italic text-brand">
            {formatBRL(calcularTotal(o)).replace(",00", "")}
          </div>
          <CardMenu
            items={[
              { label: "Ver detalhes", icon: <Eye className="size-4" />, onClick: () => nav({ to: "/orcamentos/$id", params: { id: String(o.id) } }) },
              { label: "Editar", icon: <Edit3 className="size-4" />, onClick: () => nav({ to: "/orcamentos/novo", search: { editId: o.id!, draftKey: String(o.id) } as any }) },
              { label: "Compartilhar", icon: <Share2 className="size-4" />, onClick: abrirCompartilhar },
              { label: "Mudar status", icon: <Tag className="size-4" />, onClick: () => setStatusOpen(true) },
              { label: "Recibo", icon: <Receipt className="size-4" />, onClick: () => nav({ to: "/orcamentos/$id/recibo", params: { id: String(o.id) } }) },
              { label: "Excluir", icon: <Trash2 className="size-4" />, danger: true, onClick: () => { if (confirm("Excluir orçamento?")) db.orcamentos.delete(o.id!); } },
            ]}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setStatusOpen(true)}
        className={`inline-flex items-center gap-2 glass px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_COLORS[o.status]}`}
      >
        <Tag className="size-3" /> {STATUS_LABELS[o.status]}
      </button>
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
        <button
          onClick={abrirCompartilhar}
          className="glass-brand glass-press px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-white"
        >
          <Share2 className="size-3" /> Compartilhar
        </button>
      </div>
      {statusOpen && (
        <StatusPicker
          value={o.status}
          onPick={(s) => updateStatusWithLog(o.id!, s)}
          onClose={() => setStatusOpen(false)}
        />
      )}
      {shareOpen && (
        <ShareMenu
          onClose={() => setShareOpen(false)}
          titulo={`Orçamento — ${o.clienteSnapshot?.nome ?? ""}`}
          texto={shareTexto}
          telefone={o.clienteSnapshot?.telefone}
          onSalvarPDF={async () => {
            const blob = await gerarPdfOrcamento(o);
            baixarBlob(blob, `orcamento-${o.id}.pdf`);
          }}
        />
      )}
    </div>
  );
});

function OrcamentosPage() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<StatusOrcamento | "todos">("todos");
  const [ocultarCancelados, setOcultarCancelados] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("pp.ocultarCancelados") !== "0";
  });
  function toggleOcultarCancelados() {
    setOcultarCancelados((v) => {
      const next = !v;
      if (typeof window !== "undefined")
        window.localStorage.setItem("pp.ocultarCancelados", next ? "1" : "0");
      return next;
    });
  }
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
      if (ocultarCancelados && filtro !== "cancelado" && o.status === "cancelado") return false;
      if (busca && !(o.clienteSnapshot?.nome ?? "").toLowerCase().includes(busca.toLowerCase()))
        return false;
      return true;
    });
  }, [orcamentos, filtro, busca, ocultarCancelados]);

  return (
    <div>
      <PageHeader
        eyebrow={`Histórico · ${orcamentos?.length ?? 0} total`}
        title="Orçamentos"
        actions={
          <Link
            to="/orcamentos/novo"
            search={{ modo: "flash", draftKey: String(Date.now()) }}
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

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="glass glass-press inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest"
              >
                <Filter className="size-4" strokeWidth={2.5} />
                <span>{filtro === "todos" ? "Todos" : STATUS_LABELS[filtro]}</span>
                {filtro !== "todos" && (
                  <span className="ml-1 size-1.5 rounded-full bg-brand" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-2xl">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Filtrar por status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["todos", ...STATUSES] as const).map((s) => {
                const active = filtro === s;
                return (
                  <DropdownMenuItem
                    key={s}
                    onSelect={() => setFiltro(s)}
                    className="flex items-center justify-between gap-2 rounded-xl text-sm font-semibold"
                  >
                    <span>{s === "todos" ? "Todos" : STATUS_LABELS[s]}</span>
                    {active && <Check className="size-4 text-brand" strokeWidth={3} />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={toggleOcultarCancelados}
            title={ocultarCancelados ? "Mostrar cancelados" : "Ocultar cancelados"}
            className={`glass glass-press inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest ${ocultarCancelados ? "" : "opacity-60"}`}
          >
            {ocultarCancelados ? <Check className="size-4 text-brand" strokeWidth={3} /> : <X className="size-4" strokeWidth={2.5} />}
            <span>Ocultar cancelados</span>
          </button>
        </div>

        {lista.length === 0 ? (
          <div className="brutal-border-thin border-dashed border-foreground/20 p-12 text-center">
            <p className="text-foreground/50 text-sm font-bold uppercase tracking-widest mb-4">
              Nenhum orçamento
            </p>
            <Link
              to="/orcamentos/novo"
              search={{ modo: "flash", draftKey: String(Date.now()) }}
              className="glass-brand text-white glass-press px-5 py-2.5 text-xs font-bold uppercase tracking-widest"
            >
              Criar primeiro
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {lista.map((o) => (
              <OrcamentoCard key={o.id} o={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

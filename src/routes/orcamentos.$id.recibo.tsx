import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Orcamento, type Recibo, formatBRL, FORMAS_PAGAMENTO, calcularTotal } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Field } from "./clientes";
import { gerarPdfRecibo, baixarBlob } from "@/lib/pdf";
import { ArrowLeft, FileText, Plus, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/orcamentos/$id/recibo")({
  head: ({ params }) => ({
    meta: [{ title: `Recibo · Orçamento #${params.id} — Pintor Plus` }],
  }),
  component: ReciboPage,
});

function ReciboPage() {
  const { id } = useParams({ from: "/orcamentos/$id/recibo" });
  const orcId = Number(id);
  const [o, setO] = useState<Orcamento | undefined>();
  const recibos = useLiveQuery(
    () => db.recibos.where("orcamentoId").equals(orcId).reverse().sortBy("criadoEm"),
    [orcId],
    [],
  );

  useEffect(() => {
    db.orcamentos.get(orcId).then(setO);
  }, [orcId]);

  const [form, setForm] = useState<Omit<Recibo, "id" | "criadoEm" | "orcamentoId">>({
    valor: 0,
    data: new Date().toISOString().slice(0, 10),
    formaPagamento: "PIX",
    observacao: "",
  });

  if (!o)
    return <div className="p-10 text-foreground/40 text-mono text-sm">{"> Carregando..."}</div>;

  const totalRecebido = (recibos ?? []).reduce((a, r) => a + r.valor, 0);
  const totalOrcamento = calcularTotal(o);
  const restante = totalOrcamento - totalRecebido;

  async function salvar() {
    if (!form.valor || form.valor <= 0) return;
    await db.recibos.add({
      ...form,
      orcamentoId: orcId,
      criadoEm: Date.now(),
    });
    setForm({
      valor: 0,
      data: new Date().toISOString().slice(0, 10),
      formaPagamento: "PIX",
      observacao: "",
    });
  }

  async function baixarPdf(r: Recibo, numero: number) {
    const blob = await gerarPdfRecibo({
      orcamento: o!,
      valor: r.valor,
      data: r.data,
      formaPagamento: r.formaPagamento,
      observacao: r.observacao,
      numero,
    });
    baixarBlob(blob, `recibo-${o!.id}-${numero}.pdf`);
  }

  return (
    <div>
      <PageHeader
        eyebrow={`Recibos · Orçamento #${o.id}`}
        title={o.clienteSnapshot?.nome ?? "Sem cliente"}
        actions={
          <Link
            to="/orcamentos/$id"
            params={{ id: String(o.id) }}
            className="glass glass-press px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <ArrowLeft className="size-3" /> Voltar
          </Link>
        }
      />

      <div className="px-5 lg:px-10 py-6 grid grid-cols-12 gap-3 lg:gap-4 max-w-5xl">
        {/* Resumo */}
        <div className="col-span-12 grid grid-cols-3 gap-3">
          <div className="glass p-5">
            <div className="text-mono text-[10px] uppercase text-foreground/50">Total orçamento</div>
            <div className="text-display text-xl mt-1">{formatBRL(totalOrcamento)}</div>
          </div>
          <div className="glass p-5">
            <div className="text-mono text-[10px] uppercase text-success">Recebido</div>
            <div className="text-display text-xl mt-1 text-success">{formatBRL(totalRecebido)}</div>
          </div>
          <div className="glass p-5">
            <div className="text-mono text-[10px] uppercase text-warning">Restante</div>
            <div className="text-display text-xl mt-1">{formatBRL(Math.max(0, restante))}</div>
          </div>
        </div>

        {/* Aviso */}
        <div className="col-span-12 flex items-center gap-3 bg-destructive/10 border border-destructive/40 rounded-xl p-4">
          <AlertTriangle className="size-5 text-destructive shrink-0" />
          <p className="text-xs font-bold text-destructive uppercase tracking-wide">
            Este documento NÃO é nota fiscal — apenas comprovante de recebimento
          </p>
        </div>

        {/* Form novo recibo */}
        <div className="col-span-12 lg:col-span-5 glass p-6 space-y-4">
          <div className="text-mono text-[10px] uppercase tracking-widest text-brand">
            {"> Novo recibo"}
          </div>
          <Field label="Valor recebido (R$)">
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.valor || ""}
              onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-display text-2xl focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
            />
          </Field>
          <Field label="Data">
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
            />
          </Field>
          <Field label="Forma de pagamento">
            <div className="flex flex-wrap gap-2">
              {FORMAS_PAGAMENTO.map((f) => (
                <button
                  key={f}
                  onClick={() => setForm({ ...form, formaPagamento: f })}
                  className={`brutal-border-thin px-3 py-2 text-[10px] font-black uppercase brutal-press ${
                    form.formaPagamento === f ? "bg-brand text-ink" : "bg-surface"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Observação">
            <textarea
              rows={2}
              value={form.observacao ?? ""}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all resize-none"
            />
          </Field>
          <button
            onClick={salvar}
            disabled={!form.valor || form.valor <= 0}
            className="w-full glass-brand text-white glass-press px-5 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Plus className="size-4" strokeWidth={3} /> Registrar recibo
          </button>
        </div>

        {/* Lista de recibos */}
        <div className="col-span-12 lg:col-span-7 space-y-3">
          <div className="text-mono text-[10px] uppercase tracking-widest text-brand">
            {`> Recibos emitidos (${(recibos ?? []).length})`}
          </div>
          {(recibos ?? []).length === 0 && (
            <div className="glass border-dashed border-white/15 p-8 text-center text-sm font-bold uppercase text-foreground/50">
              Nenhum recibo registrado
            </div>
          )}
          {(recibos ?? []).map((r, idx) => {
            const numero = (recibos ?? []).length - idx;
            return (
              <div key={r.id} className="glass p-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-mono text-[10px] uppercase text-foreground/40">
                    Nº {String(numero).padStart(4, "0")} ·{" "}
                    {format(new Date(r.data), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-display text-2xl text-success">{formatBRL(r.valor)}</p>
                  <p className="text-xs text-foreground/60">{r.formaPagamento}</p>
                  {r.observacao && (
                    <p className="text-xs text-foreground/50 italic mt-1">{r.observacao}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => baixarPdf(r, numero)}
                    className="glass glass-press px-3 py-2 text-[10px] font-bold uppercase flex items-center gap-1.5"
                  >
                    <FileText className="size-3" /> PDF
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Excluir este recibo?")) await db.recibos.delete(r.id!);
                    }}
                    className="glass glass-press px-3 py-2 text-[10px] font-bold uppercase text-destructive flex items-center gap-1.5"
                  >
                    <Trash2 className="size-3" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

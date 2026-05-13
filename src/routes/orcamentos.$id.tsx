import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  db,
  type Orcamento,
  calcularTotal,
  formatBRL,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { gerarPdfOrcamento, gerarMensagemWhatsapp, baixarBlob } from "@/lib/pdf";
import { whatsappLink } from "@/lib/utils";
import { urlFoto } from "@/lib/fotos";
import { FileText, MessageCircle, Receipt, Edit3, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/orcamentos/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Orçamento #${params.id} — Pintor Plus` }],
  }),
  component: OrcamentoDetalhe,
});

function OrcamentoDetalhe() {
  const { id } = useParams({ from: "/orcamentos/$id" });
  const [o, setO] = useState<Orcamento | undefined>();

  useEffect(() => {
    db.orcamentos.get(Number(id)).then(setO);
  }, [id]);

  if (!o)
    return (
      <div className="p-10 text-foreground/40 text-mono text-sm">{"> Carregando..."}</div>
    );

  const total = calcularTotal(o);

  return (
    <div>
      <PageHeader
        eyebrow={`Orçamento · #${o.id}`}
        title={o.clienteSnapshot?.nome ?? "Sem cliente"}
        actions={
          <Link
            to="/orcamentos"
            className="brutal-border-thin px-3 py-2 text-[10px] font-black uppercase tracking-widest brutal-press flex items-center gap-1"
          >
            <ArrowLeft className="size-3" /> Voltar
          </Link>
        }
      />
      <div className="px-5 lg:px-10 py-6 grid grid-cols-12 gap-3 lg:gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="bg-brand text-ink brutal-border brutal-shadow p-6">
            <div className="text-mono text-[10px] uppercase opacity-60">Total</div>
            <div className="text-display text-5xl italic">{formatBRL(total)}</div>
            <div
              className={`inline-block mt-3 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[o.status]}`}
            >
              {STATUS_LABELS[o.status]}
            </div>
          </div>

          {o.ambientes.map((a) => (
            <div key={a.id} className="bg-surface brutal-border p-5">
              <h3 className="text-display text-xl italic mb-3">{a.nome}</h3>
              <div className="space-y-3">
                {a.itens.map((it) => (
                  <div key={it.id} className="brutal-border-thin p-3">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="font-black uppercase text-sm">{it.nome}</p>
                        {it.altura && it.comprimento && (
                          <p className="text-mono text-[10px] text-foreground/40">
                            {it.altura}m × {it.comprimento}m ={" "}
                            {(it.altura * it.comprimento).toFixed(2)}m²
                          </p>
                        )}
                        {it.servicos.length > 0 && (
                          <p className="text-xs text-foreground/60 mt-1">
                            {it.servicos.join(" · ")}
                          </p>
                        )}
                        {it.observacao && (
                          <p className="text-xs text-foreground/50 italic mt-1">
                            {it.observacao}
                          </p>
                        )}
                      </div>
                      <div className="text-display text-lg italic text-brand shrink-0">
                        {formatBRL(it.preco || 0).replace(",00", "")}
                      </div>
                    </div>
                    {it.fotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-1 mt-2">
                        {it.fotos.map((fid) => (
                          <Thumb key={fid} id={fid} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="bg-surface brutal-border p-4 space-y-2">
            <div className="text-mono text-[10px] uppercase text-brand">{"> Ações"}</div>
            <Link
              to="/orcamentos/novo"
              className="w-full bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Edit3 className="size-3" /> Editar (em breve)
            </Link>
            <button
              onClick={async () => {
                const blob = await gerarPdfOrcamento(o);
                baixarBlob(blob, `orcamento-${o.id}.pdf`);
              }}
              className="w-full brutal-border-thin brutal-press px-4 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <FileText className="size-3" /> Baixar PDF
            </button>
            {o.clienteSnapshot?.telefone && (
              <button
                onClick={async () => {
                  const m = await gerarMensagemWhatsapp(o);
                  window.open(whatsappLink(o.clienteSnapshot!.telefone!, m), "_blank");
                }}
                className="w-full bg-success text-ink brutal-border-thin brutal-press px-4 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <MessageCircle className="size-3" /> WhatsApp
              </button>
            )}
            <button
              disabled
              className="w-full brutal-border-thin px-4 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 opacity-40"
            >
              <Receipt className="size-3" /> Recibo (em breve)
            </button>
          </div>

          <div className="bg-surface brutal-border p-4 space-y-1 text-xs">
            <div className="text-mono text-[10px] uppercase text-brand mb-2">{"> Detalhes"}</div>
            <p>
              <strong>Pagamento:</strong> {o.formaPagamento ?? "—"}
            </p>
            <p>
              <strong>Validade:</strong> {o.validade ?? "—"}
            </p>
            <p>
              <strong>Início:</strong> {o.inicio ?? "—"}
            </p>
            {o.observacoes && (
              <p className="pt-2 text-foreground/70 italic">{o.observacoes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Thumb({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    urlFoto(id).then(setUrl);
  }, [id]);
  return (
    <div className="aspect-square bg-midnight brutal-border-thin overflow-hidden">
      {url && <img src={url} alt="Foto" className="size-full object-cover" />}
    </div>
  );
}

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
import { FileText, MessageCircle, Receipt, Edit3, ArrowLeft, ScrollText, X } from "lucide-react";

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
            className="glass glass-press px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <ArrowLeft className="size-3" /> Voltar
          </Link>
        }
      />
      <div className="px-5 lg:px-10 py-6 grid grid-cols-12 gap-3 lg:gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-3">
          <div className="glass glass-brand text-white p-8 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="text-mono text-[10px] uppercase opacity-70 relative z-10">Valor Total</div>
            <div className="text-display text-5xl lg:text-7xl italic leading-none relative z-10 drop-shadow-lg">{formatBRL(total)}</div>
            <div
              className={`inline-block mt-5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest relative z-10 ${STATUS_COLORS[o.status]}`}
            >
              {STATUS_LABELS[o.status]}
            </div>
          </div>

          {o.ambientes.map((a) => (
            <div key={a.id} className="glass p-6 group">
              <h3 className="text-display text-xl italic mb-3">{a.nome}</h3>
              <div className="space-y-3">
                {a.itens.map((it) => (
                  <div key={it.id} className="glass border-white/5 bg-white/[0.02] p-4 group-hover:bg-white/[0.04] transition-all">
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
          <div className="glass p-6 space-y-3">
            <div className="text-mono text-[10px] uppercase text-brand">{"> Ações"}</div>
            <Link
              to="/orcamentos/novo"
              search={{ editId: o.id }}
              className="w-full glass-brand text-white glass-press px-5 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Edit3 className="size-3" /> Editar
            </Link>
            <button
              onClick={async () => {
                const blob = await gerarPdfOrcamento(o);
                baixarBlob(blob, `orcamento-${o.id}.pdf`);
              }}
              className="w-full glass glass-press px-5 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <FileText className="size-3" /> Baixar PDF
            </button>
            {o.clienteSnapshot?.telefone && (
              <button
                onClick={async () => {
                  const m = await gerarMensagemWhatsapp(o);
                  window.open(whatsappLink(o.clienteSnapshot!.telefone!, m), "_blank");
                }}
                className="w-full glass-brand glass-press border-white/20 px-5 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 text-white"
              >
                <MessageCircle className="size-3" /> WhatsApp
              </button>
            )}
            <Link
              to="/orcamentos/$id/recibo"
              params={{ id: String(o.id) }}
              className="w-full glass glass-press px-5 py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Receipt className="size-3" /> Recibo
            </Link>
          </div>

          <div className="glass p-6 space-y-2 text-sm">
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
    <div className="aspect-square bg-white/5 rounded-lg overflow-hidden border border-white/10 group-hover:border-white/30 transition-all">
      {url && <img src={url} alt="Foto" className="size-full object-cover" />}
    </div>
  );
}

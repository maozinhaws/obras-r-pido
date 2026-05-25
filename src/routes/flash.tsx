import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  formatBRL,
  type Cliente,
  type Orcamento,
  type Ambiente,
  type ItemAmbiente,
} from "@/lib/db";
import { persistOrcamento } from "@/lib/orcamentos";
import { gerarPdfOrcamento, gerarMensagemWhatsapp, baixarBlob } from "@/lib/pdf";
import { uid, whatsappLink } from "@/lib/utils";
import { handleEnterNav } from "@/lib/forms";
import { ShareMenu } from "@/components/share-menu";
import { ItemEditorModal, novoItemPadrao } from "@/components/item-editor-modal";
import {
  X,
  Plus,
  Trash2,
  Zap,
  FileText,
  MessageCircle,
  Share2,
  Save,
  ChevronDown,
  Camera,
} from "lucide-react";

export const Route = createFileRoute("/flash")({
  head: () => ({
    meta: [{ title: "Modo Flash — Pintor Plus" }],
  }),
  component: FlashPage,
});

function FlashPage() {
  const nav = useNavigate();
  const clientes = useLiveQuery(() => db.clientes.orderBy("nome").toArray(), [], []);
  const config = useLiveQuery(() => db.config.get(1), [], undefined);

  const [clienteId, setClienteId] = useState<number | undefined>();
  const [clienteNome, setClienteNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [itens, setItens] = useState<ItemAmbiente[]>([]);
  const [editando, setEditando] = useState<ItemAmbiente | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [obs, setObs] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTexto, setShareTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  const sugestoes = useMemo(() => {
    const lista = config?.flashServicos?.length ? config.flashServicos : [
      "Parede",
      "Teto",
      "Fachada",
      "Portão",
      "Janela",
      "Muro",
    ];
    return lista.slice(0, 8);
  }, [config?.flashServicos]);

  const total = useMemo(
    () => itens.reduce((acc, it) => acc + (it.preco || 0), 0),
    [itens],
  );

  function abrirNovo(nomeSugerido = "") {
    setEditando(novoItemPadrao(nomeSugerido));
  }

  function salvarItem(it: ItemAmbiente) {
    setItens((prev) => {
      const i = prev.findIndex((x) => x.id === it.id);
      if (i === -1) return [...prev, it];
      const c = [...prev];
      c[i] = it;
      return c;
    });
    setEditando(null);
  }

  function removerItem(id: string) {
    setItens((prev) => prev.filter((x) => x.id !== id));
  }

  function pickCliente(c: Cliente) {
    setClienteId(c.id);
    setClienteNome(c.nome);
    setTelefone(c.telefone ?? "");
    setPickerOpen(false);
  }

  async function montarOrcamento(persist: boolean): Promise<Orcamento> {
    const ambiente: Ambiente = { id: uid(), nome: "Geral", itens };

    let snapshot: Cliente | undefined;
    if (clienteId) {
      snapshot = await db.clientes.get(clienteId);
    } else if (clienteNome.trim()) {
      snapshot = {
        nome: clienteNome.trim(),
        telefone: telefone.trim() || undefined,
        criadoEm: Date.now(),
      };
    }

    const orc: Orcamento = {
      clienteId,
      clienteSnapshot: snapshot,
      ambientes: [ambiente],
      formatoMensagem: "simples",
      observacoes: obs.trim() || undefined,
      status: "rascunho",
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
      historico: [],
    };

    if (persist) return await persistOrcamento(orc);
    return orc;
  }

  async function salvarESair() {
    setSalvando(true);
    try {
      const saved = await montarOrcamento(true);
      nav({ to: "/orcamentos/$id", params: { id: String(saved.id) } });
    } finally {
      setSalvando(false);
    }
  }
  async function gerarPDF() {
    const orc = await montarOrcamento(true);
    const blob = await gerarPdfOrcamento(orc);
    baixarBlob(blob, `orcamento-flash-${orc.id ?? Date.now()}.pdf`);
  }
  async function enviarWA() {
    const orc = await montarOrcamento(true);
    const msg = await gerarMensagemWhatsapp(orc);
    if (orc.clienteSnapshot?.telefone) {
      window.open(whatsappLink(orc.clienteSnapshot.telefone, msg), "_blank");
    } else {
      setShareTexto(msg);
      setShareOpen(true);
    }
  }
  async function compartilhar() {
    const orc = await montarOrcamento(true);
    const msg = await gerarMensagemWhatsapp(orc);
    setShareTexto(msg);
    setShareOpen(true);
  }

  const podeSalvar = itens.length > 0;

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg-hero)" }}>
      <header className="sticky top-0 z-30 backdrop-blur bg-card/90 border-b border-border px-4 py-3 flex items-center gap-3">
        <span className="size-9 rounded-xl grid place-items-center text-white" style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)" }}>
          <Zap className="size-5" strokeWidth={2.5} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-2 leading-none">Modo Flash</p>
          <h1 className="text-display text-base leading-tight truncate">Orçamento rápido</h1>
        </div>
        <button
          onClick={() => nav({ to: "/" })}
          aria-label="Fechar"
          className="size-9 rounded-full bg-muted grid place-items-center border border-border"
        >
          <X className="size-4" strokeWidth={2.5} />
        </button>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-md mx-auto">
        {/* Cliente */}
        <form
          data-enter-nav
          onKeyDown={handleEnterNav}
          onSubmit={(e) => e.preventDefault()}
          className="glass p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Cliente</span>
            {(clientes ?? []).length > 0 && (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-brand-2 inline-flex items-center gap-1"
              >
                Escolher salvo <ChevronDown className="size-3" strokeWidth={3} />
              </button>
            )}
          </div>
          <input
            value={clienteNome}
            onChange={(e) => {
              setClienteNome(e.target.value);
              setClienteId(undefined);
            }}
            placeholder="Nome do cliente"
            className="w-full px-4 py-3"
          />
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Telefone (opcional)"
            inputMode="tel"
            className="w-full px-4 py-3"
          />
        </form>

        {/* Itens */}
        <div className="glass p-4 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-foreground/60">
            Itens · {itens.length}
          </div>

          {/* Sugestões rápidas — abrem o modal com nome pré-preenchido */}
          <div className="flex flex-wrap gap-1.5">
            {sugestoes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => abrirNovo(s)}
                className="chip"
              >
                + {s}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {itens.map((it) => (
              <div
                key={it.id}
                className="flex gap-2 items-stretch rounded-2xl bg-white border-2 border-brand-2/30 p-3"
              >
                <button
                  type="button"
                  onClick={() => setEditando(it)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm font-bold text-slate-950 truncate">{it.nome || "Item"}</p>
                  {it.fotos.length > 0 && (
                    <p className="text-[10px] text-brand-2 inline-flex items-center gap-1 mt-0.5">
                      <Camera className="size-3" /> {it.fotos.length} foto(s)
                    </p>
                  )}
                </button>
                <div className="text-display text-lg text-brand-2 self-center pr-2">
                  {formatBRL(it.preco || 0).replace(",00", "")}
                </div>
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => removerItem(it.id)}
                  className="size-10 rounded-xl bg-muted grid place-items-center border border-border shrink-0 self-center"
                >
                  <Trash2 className="size-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => abrirNovo()}
            className="w-full text-white py-3 rounded-xl inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95"
            style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)" }}
          >
            <Plus className="size-4" strokeWidth={3} /> Adicionar item
          </button>
        </div>

        {/* Observações */}
        <div className="glass p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-foreground/60">Observações</div>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
            placeholder="Detalhes adicionais (opcional)"
            className="w-full px-3 py-3 resize-none"
          />
        </div>

        {/* Total */}
        <div
          className="rounded-3xl p-5 text-white"
          style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)", borderRadius: "20px 0 20px 20px" }}
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">Total</div>
          <div className="text-display text-4xl italic mt-1">{formatBRL(total)}</div>
        </div>
      </div>

      {/* Footer fixo de ações */}
      <div className="fixed left-0 right-0 z-30 bg-card/95 backdrop-blur border-t border-border safe-area-bottom">
        <div className="max-w-md mx-auto p-3 grid grid-cols-4 gap-2">
          <ActBtn label="WA" icon={<MessageCircle className="size-4" />} onClick={enviarWA} disabled={!podeSalvar} />
          <ActBtn label="PDF" icon={<FileText className="size-4" />} onClick={gerarPDF} disabled={!podeSalvar} />
          <ActBtn label="Enviar" icon={<Share2 className="size-4" />} onClick={compartilhar} disabled={!podeSalvar} />
          <ActBtn label="Salvar" icon={<Save className="size-4" />} onClick={salvarESair} disabled={!podeSalvar || salvando} primary />
        </div>
      </div>

      <ItemEditorModal
        open={!!editando}
        item={editando}
        mode="flash"
        onCancel={() => setEditando(null)}
        onSave={salvarItem}
        onDelete={editando && itens.some((x) => x.id === editando.id)
          ? () => { removerItem(editando!.id); setEditando(null); }
          : undefined}
      />

      {pickerOpen && (
        <div className="fixed inset-0 z-[70] bg-[color-mix(in_oklab,#0a0420_55%,transparent)] backdrop-blur-md flex items-end sm:items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="modal-glass w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-display text-lg">Clientes salvos</h3>
              <button onClick={() => setPickerOpen(false)} aria-label="Fechar" className="size-9 rounded-full bg-muted grid place-items-center">
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
              {(clientes ?? []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickCliente(c)}
                  className="w-full text-left p-3 rounded-2xl bg-muted/40 hover:bg-muted active:scale-[0.99]"
                >
                  <p className="font-bold text-sm">{c.nome}</p>
                  {c.telefone && <p className="text-[11px] text-foreground/60">{c.telefone}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <ShareMenu
          onClose={() => setShareOpen(false)}
          titulo={`Orçamento — ${clienteNome || "Flash"}`}
          texto={shareTexto}
          telefone={telefone || undefined}
        />
      )}
    </div>
  );
}

function ActBtn({
  label,
  icon,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest active:scale-95 transition disabled:opacity-40 ${
        primary
          ? "text-white"
          : "bg-muted border border-border text-foreground"
      }`}
      style={primary ? { background: "linear-gradient(135deg,#ff6b35,#7b5cff)" } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

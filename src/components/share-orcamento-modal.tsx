import { useEffect, useMemo, useState } from "react";
import { X, Share2, MessageCircle, Copy, Download, FileText, Image as ImageIcon } from "lucide-react";
import type { Orcamento } from "@/lib/db";
import { gerarMensagemWhatsapp, gerarPdfOrcamento, baixarBlob } from "@/lib/pdf";
import { compartilharNativo, copiarTexto, abrirWhatsApp, podeNativoCompartilhar, blobParaFile } from "@/lib/share";
import { persistOrcamento } from "@/lib/orcamentos";

type Formato = "completo" | "area" | "simples";

const FORMATOS: { id: Formato; label: string; desc: string }[] = [
  { id: "completo", label: "Completa", desc: "Todos os itens e serviços" },
  { id: "area", label: "Área total", desc: "Por ambiente com m² e valor" },
  { id: "simples", label: "Resumida", desc: "Apenas cliente e total" },
];

export interface ShareOrcamentoModalProps {
  orcamento: Orcamento;
  onClose: () => void;
}

export function ShareOrcamentoModal({ orcamento, onClose }: ShareOrcamentoModalProps) {
  const [formato, setFormato] = useState<Formato>(orcamento.formatoMensagem ?? "completo");
  const [incluirPdf, setIncluirPdf] = useState<boolean>(true);
  const [incluirImagens, setIncluirImagens] = useState<boolean>(orcamento.incluirFotosPdf !== false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // versão atualizada do orçamento de acordo com escolhas (sem persistir até enviar)
  const orcAtualizado: Orcamento = useMemo(
    () => ({ ...orcamento, formatoMensagem: formato, incluirFotosPdf: incluirImagens }),
    [orcamento, formato, incluirImagens],
  );

  async function persistirEscolhas() {
    try {
      await persistOrcamento(orcAtualizado);
    } catch {
      /* ignore */
    }
  }

  async function gerarTexto() {
    return await gerarMensagemWhatsapp(orcAtualizado);
  }

  async function gerarArquivoPdf() {
    if (!incluirPdf) return null;
    const blob = await gerarPdfOrcamento(orcAtualizado);
    return { blob, nome: `orcamento-${orcamento.id}.pdf` };
  }

  async function nativo() {
    setBusy(true);
    try {
      const texto = await gerarTexto();
      const arquivo = await gerarArquivoPdf();
      const files = arquivo ? [blobParaFile(arquivo.blob, arquivo.nome)] : undefined;
      await persistirEscolhas();
      const ok = await compartilharNativo({
        title: `Orçamento — ${orcamento.clienteSnapshot?.nome ?? ""}`,
        text: texto,
        files,
      });
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  }

  async function whats() {
    if (!orcamento.clienteSnapshot?.telefone) return;
    setBusy(true);
    try {
      const texto = await gerarTexto();
      await persistirEscolhas();
      // se PDF foi pedido, baixa para o usuário anexar manualmente no WhatsApp Web
      if (incluirPdf) {
        const arquivo = await gerarArquivoPdf();
        if (arquivo) baixarBlob(arquivo.blob, arquivo.nome);
      }
      abrirWhatsApp(orcamento.clienteSnapshot.telefone, texto);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    setBusy(true);
    try {
      const texto = await gerarTexto();
      await persistirEscolhas();
      const ok = await copiarTexto(texto);
      if (incluirPdf) {
        const arquivo = await gerarArquivoPdf();
        if (arquivo) baixarBlob(arquivo.blob, arquivo.nome);
      }
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  }

  async function baixarSoPdf() {
    setBusy(true);
    try {
      await persistirEscolhas();
      const arquivo = await gerarArquivoPdf();
      if (arquivo) baixarBlob(arquivo.blob, arquivo.nome);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 70 }} onClick={onClose}>
      <div className="modal-glass w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color-mix(in_oklab,var(--brand-2)_20%,transparent)]">
          <h3 className="text-display text-lg text-foreground">Compartilhar orçamento</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full bg-[color-mix(in_oklab,var(--card)_70%,transparent)] backdrop-blur grid place-items-center border border-border/60"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Formato da mensagem */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">
              Formato da mensagem
            </p>
            <div className="grid grid-cols-1 gap-2">
              {FORMATOS.map((f) => {
                const active = formato === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormato(f.id)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all ${
                      active
                        ? "border-brand bg-brand/10"
                        : "border-border/60 bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-foreground">{f.label}</p>
                        <p className="text-xs text-foreground/60">{f.desc}</p>
                      </div>
                      <span
                        className={`size-4 rounded-full border-2 shrink-0 ${
                          active ? "border-brand bg-brand" : "border-foreground/30"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opções de PDF */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">
              Anexo PDF
            </p>
            <CheckRow
              checked={incluirPdf}
              onChange={setIncluirPdf}
              icon={<FileText className="size-5 text-brand" />}
              label="Incluir PDF"
              hint="Gera o orçamento em PDF para anexar"
            />
            {incluirPdf && (
              <div className="pl-3 border-l-2 border-brand/40">
                <CheckRow
                  checked={incluirImagens}
                  onChange={setIncluirImagens}
                  icon={<ImageIcon className="size-5 text-brand-2" />}
                  label="Incluir imagens"
                  hint="Anexa fotos dos itens (com marca d'água)"
                />
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-2">
            {podeNativoCompartilhar() && (
              <Row
                disabled={busy}
                icon={<Share2 className="size-5" />}
                label="Compartilhar (sistema)"
                onClick={nativo}
              />
            )}
            {orcamento.clienteSnapshot?.telefone && (
              <Row
                disabled={busy}
                icon={<MessageCircle className="size-5 text-success" />}
                label="Enviar pelo WhatsApp"
                onClick={whats}
              />
            )}
            <Row
              disabled={busy}
              icon={<Copy className="size-5" />}
              label={incluirPdf ? "Copiar texto + baixar PDF" : "Copiar texto"}
              onClick={copiar}
            />
            {incluirPdf && (
              <Row
                disabled={busy}
                icon={<Download className="size-5 text-brand" />}
                label="Apenas baixar PDF"
                onClick={baixarSoPdf}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  icon,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/40 hover:bg-muted active:scale-[0.99] text-left"
    >
      <span className="size-10 rounded-xl bg-card grid place-items-center border border-border shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-sm text-foreground">{label}</span>
        {hint && <span className="block text-xs text-foreground/60">{hint}</span>}
      </span>
      <span
        className={`size-6 rounded-md border-2 grid place-items-center shrink-0 transition-all ${
          checked ? "bg-brand border-brand" : "bg-transparent border-foreground/40"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth={4}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
    </button>
  );
}

function Row({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-muted/40 hover:bg-muted active:scale-[0.99] text-left disabled:opacity-50"
    >
      <span className="size-10 rounded-xl bg-card grid place-items-center border border-border shrink-0">
        {icon}
      </span>
      <span className="font-bold text-sm text-foreground">{label}</span>
    </button>
  );
}
